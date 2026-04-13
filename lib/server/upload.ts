'use server'

import { createServerClient } from '@/lib/supabase-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'

/**
 * SERVER ACTION: uploadFile
 * =========================
 *
 * Securely uploads supplier PDFs/images and creates database records.
 *
 * WHY SERVER ACTION?
 * This runs on the server (not browser), so we can:
 * - Keep Supabase API keys secure (never exposed to client)
 * - Validate files server-side (users can't bypass checks with DevTools)
 * - Access database directly (no REST API needed)
 * - Return upload ID safely (no risk of tampering)
 *
 * WHAT IT DOES:
 * 1. Validate file (type and size)
 * 2. Verify user is authenticated
 * 3. Upload file to Supabase Storage
 * 4. Create database record to track the upload
 * 5. Return upload ID for AI extraction step
 *
 * VALIDATION RULES:
 * ├─ File type: PDF or image only (MIME type checked)
 * ├─ File size: Max 10MB (prevents storage abuse)
 * ├─ User auth: Must have valid Supabase session (checked from cookies)
 * └─ File required: FormData must contain 'file' field
 *
 * STORAGE STRUCTURE:
 * Uploads bucket/
 * ├─ <user-id-1>/
 * │  ├─ 1712948572304.pdf
 * │  └─ 1712948574891.png
 * └─ <user-id-2>/
 *    └─ 1712948598234.pdf
 *
 * Files stored under user ID folders for two reasons:
 * 1. Security: RLS policies can enforce "users only see their own folder"
 * 2. Organization: Easy to clean up when user deletes account
 *
 * DATABASE RECORD:
 * Creates entry in 'uploads' table:
 * - id: auto-generated UUID
 * - profile_id: user's ID (for RLS queries)
 * - file_name: original filename (e.g., "product.pdf")
 * - file_path: path in storage (e.g., "user-id/1712948572304.pdf")
 * - file_type: 'pdf' or 'image' (for filtering)
 * - created_at: timestamp (auto-generated)
 *
 * ERROR HANDLING:
 * Returns one of:
 * ├─ { success: true, uploadId: '...' }          → All good, proceed to extraction
 * ├─ { error: 'No file provided' }                → User didn't select file
 * ├─ { error: 'Only PDF and image files...' }     → Wrong file type
 * ├─ { error: 'File size must be less than 10MB'} → File too large
 * ├─ { error: 'Not authenticated' }               → User not logged in
 * ├─ { error: 'Upload failed: ...' }              → Storage upload error
 * ├─ { error: 'Failed to save upload: ...' }      → Database insert error
 * └─ { error: 'An unexpected error occurred' }    → Caught exception
 *
 * NEVER return sensitive info (stack traces, API keys, etc.).
 * Log details to server logs for debugging, but send generic messages to client.
 *
 * @param formData - FormData object with 'file' field from form submission
 *
 * @returns { success: true, uploadId: string } on success
 *          { error: string } on any failure
 *
 * @example
 * // In a React component:
 * const formData = new FormData()
 * formData.append('file', fileInput.files[0])
 * const result = await uploadFile(formData)
 * if (result.error) {
 *   setError(result.error)  // Show error to user
 * } else {
 *   router.push(`/app/extract/${result.uploadId}`)  // Next step
 * }
 */
export async function uploadFile(formData: FormData) {
  console.log('\n🚀 ═══════════════════════════════════════════════════════════════')
  console.log('🚀 UPLOAD FILE START - Full Debug Mode')
  console.log('🚀 ═══════════════════════════════════════════════════════════════\n')

  // STEP 0: Inspect FormData
  console.log('📋 Step 0: FormData inspection')
  console.log('  - FormData keys:', Array.from(formData.keys()))
  const file = formData.get('file') as File
  console.log('  - file extracted:', file ? 'YES' : 'NO')

  // STEP 1: Check file exists
  if (!file) {
    console.error('❌ Step 1 FAILED: No file in formData')
    return { error: 'No file provided' }
  }

  console.log('✅ Step 1: File exists in FormData')
  console.log('  - name:', file.name)
  console.log('  - size:', file.size, 'bytes')
  console.log('  - type:', file.type)
  console.log('  - lastModified:', file.lastModified)

  // STEP 2: Validate file type
  console.log('\n📋 Step 2: Validate file type')
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'
  console.log('  - isImage:', isImage)
  console.log('  - isPdf:', isPdf)

  if (!isImage && !isPdf) {
    console.error('❌ Step 2 FAILED: Invalid file type')
    return { error: 'Only PDF and image files are supported' }
  }
  console.log('✅ Step 2: File type valid')

  // STEP 3: Validate file size
  console.log('\n📋 Step 3: Validate file size')
  const maxSize = 10 * 1024 * 1024
  console.log('  - maxSize:', maxSize, 'bytes (10MB)')
  console.log('  - file.size:', file.size, 'bytes')
  console.log('  - ratio:', ((file.size / maxSize) * 100).toFixed(2) + '%')

  if (file.size > maxSize) {
    console.error('❌ Step 3 FAILED: File too large')
    return { error: 'File size must be less than 10MB' }
  }
  console.log('✅ Step 3: File size valid')

  try {
    // STEP 4: Create Supabase client
    console.log('\n📋 Step 4: Create Supabase client')
    console.log('  - Calling createServerClient()...')
    const supabase = await createServerClient()
    console.log('✅ Step 4: Supabase client created')
    console.log('  - supabase object keys:', Object.keys(supabase).slice(0, 5), '...')

    // STEP 5: Get authenticated user
    console.log('\n📋 Step 5: Get authenticated user')
    console.log('  - Calling supabase.auth.getUser()...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('  - Auth call result:')
    console.log('    - user:', user ? 'EXISTS' : 'NULL')
    console.log('    - error:', authError ? 'YES - ' + authError.message : 'NO')

    if (user) {
      console.log('✅ Step 5: User authenticated')
    } else {
      console.error('❌ Step 5 FAILED: User is null')
      console.error('  - authError:', authError)
      return { error: 'Not authenticated' }
    }

    // STEP 5.5: Rate limit check
    console.log('\n📋 Step 5.5: Rate limiting')
    try {
      const { remaining } = enforceRateLimit(user.id, 'upload')
      console.log(`✅ Rate limit check passed - ${remaining} uploads remaining this hour`)
    } catch (rateLimitError) {
      console.error('❌ Step 5.5 FAILED: Rate limit exceeded')
      console.error('  -', rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError))
      return { error: 'Too many uploads. Please try again in an hour.' }
    }

    // STEP 6: Generate unique filename
    console.log('\n📋 Step 6: Generate unique filename')
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${timestamp}.${fileExt}`
    console.log('  - original name:', file.name)
    console.log('  - extension:', fileExt)
    console.log('  - timestamp:', timestamp)
    console.log('  - generated fileName:', fileName)
    console.log('✅ Step 6: Filename generated')

    // STEP 7: Create storage path
    console.log('\n📋 Step 7: Create storage path')
    const filePath = `${user.id}/${fileName}`
    console.log('  - user.id:', user.id)
    console.log('  - fileName:', fileName)
    console.log('  - filePath:', filePath)
    console.log('✅ Step 7: Storage path created')

    // STEP 8: Upload to Supabase Storage
    console.log('\n📋 Step 8: Upload file to Supabase Storage')
    console.log('  - bucket: uploads')
    console.log('  - path:', filePath)
    console.log('  - contentType:', file.type)
    console.log('  - file size:', file.size, 'bytes')
    console.log('  - Calling storage.upload()...')

    const { data: storageData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type,
      })

    console.log('  - Storage upload result:')
    if (uploadError) {
      console.error('❌ Step 8 FAILED: Storage upload error')
      console.error('  - error.name:', uploadError.name)
      console.error('  - error.message:', uploadError.message)
      console.error('  - error:', uploadError)
      return { error: `Upload failed: ${uploadError.message}` }
    } else {
      console.log('✅ Step 8: File uploaded to storage')
      console.log('  - storageData:', storageData)
      console.log('  - storageData.path:', storageData?.path)
      console.log('  - storageData.id:', storageData?.id)
    }

    // STEP 9: Create database record
    console.log('\n📋 Step 9: Create database record')
    const insertData = {
      profile_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: isImage ? 'image' : 'pdf',
    }
    console.log('  - insertData:', JSON.stringify(insertData, null, 2))
    console.log('  - Calling supabase.from("uploads").insert()...')

    const { data: dbData, error: dbError } = await supabase
      .from('uploads')
      .insert(insertData)
      .select()
      .single()

    console.log('  - Database insert result:')
    console.log('    - data:', dbData)
    console.log('    - error:', dbError ? 'YES' : 'NO')

    if (dbError) {
      console.error('❌ Step 9 FAILED: Database insert error')
      console.error('  - error.name:', (dbError as any).name)
      console.error('  - error.message:', dbError.message)
      console.error('  - error.code:', (dbError as any).code)
      console.error('  - error.status:', (dbError as any).status)
      console.error('  - error.details:', (dbError as any).details)
      console.error('  - error.hint:', (dbError as any).hint)
      console.error('  - Full error object:', JSON.stringify(dbError, null, 2))
      return { error: `Failed to save upload: ${dbError.message}` }
    }

    console.log('✅ Step 9: Database record created')
    console.log('  - dbData.id:', dbData?.id)
    console.log('  - dbData:', JSON.stringify(dbData, null, 2))

    // STEP 10: Revalidate cache
    console.log('\n📋 Step 10: Revalidate cache')
    revalidatePath('/app/wave')
    console.log('✅ Step 10: Cache revalidated for /app/wave')

    // STEP 11: Success
    console.log('\n✅ ═══════════════════════════════════════════════════════════════')
    console.log('✅ UPLOAD FILE SUCCESS')
    console.log('✅ uploadId:', dbData?.id)
    console.log('✅ ═══════════════════════════════════════════════════════════════\n')

    return { success: true, uploadId: dbData?.id }
  } catch (error) {
    console.error('\n❌ ═══════════════════════════════════════════════════════════════')
    console.error('❌ UNEXPECTED ERROR IN TRY BLOCK')
    console.error('❌ ═══════════════════════════════════════════════════════════════')
    console.error('  - error:', error)
    console.error('  - error.name:', (error as any).name)
    console.error('  - error.message:', (error as any).message)
    console.error('  - error.stack:', (error as any).stack)
    console.error('❌ ═══════════════════════════════════════════════════════════════\n')
    return { error: 'An unexpected error occurred' }
  }
}
