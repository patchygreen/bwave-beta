'use server'

import { createServerClient } from '@/lib/supabase-server'
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
  const file = formData.get('file') as File

  // STEP 1: Check file exists
  if (!file) {
    return { error: 'No file provided' }
  }

  // STEP 2: Validate file type
  // We check MIME type (file.type) not just extension
  // Extension-only check can be faked: rename .exe to .pdf
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  if (!isImage && !isPdf) {
    return { error: 'Only PDF and image files are supported' }
  }

  // STEP 3: Validate file size
  // 10MB = 10 * 1024 * 1024 bytes
  // Prevents someone from uploading 1GB file and crashing our storage
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { error: 'File size must be less than 10MB' }
  }

  try {
    // STEP 4: Get Supabase client (with user session)
    const supabase = await createServerClient()

    // STEP 5: Verify user is authenticated
    // getUser() reads the session cookie and asks Supabase if it's valid
    // If no cookie or expired cookie, user will be null
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // STEP 6: Generate unique filename
    // Use timestamp to avoid collisions (two users can't upload "product.pdf" at same time)
    // Example: 1712948572304.pdf (timestamp in milliseconds)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`

    // STEP 7: Create storage path
    // Format: <user-id>/<timestamp>.<ext>
    // Example: "550e8400-e29b-41d4-a716-446655440000/1712948572304.pdf"
    // This lets Supabase RLS policy verify: "This user can only upload to their folder"
    const filePath = `${user.id}/${fileName}`

    // STEP 8: Upload file to Supabase Storage
    // This sends file data to Supabase servers
    // Throws error if network fails, file too large, or storage quota exceeded
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type, // Tells Supabase what type of file this is
      })

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` }
    }

    // STEP 9: Create database record
    // We need to track:
    // - Where the file is stored (file_path)
    // - What the user called it (file_name)
    // - What type it is (file_type)
    // - Which user uploaded it (profile_id)
    // This metadata helps us retrieve and process the file later
    const { data, error: dbError } = await supabase
      .from('uploads')
      .insert({
        profile_id: user.id,
        file_name: file.name,      // "product-catalog.pdf"
        file_path: filePath,        // "user-id/1712948572304.pdf"
        file_type: isImage ? 'image' : 'pdf',
      })
      .select()                     // Return the inserted row
      .single()                     // Expect exactly one row

    if (dbError) {
      return { error: `Failed to save upload: ${dbError.message}` }
    }

    // STEP 10: Clear cached data
    // Next.js caches page content for performance
    // Since we just created a new upload, old cache is stale
    // Revalidate tells Next.js to refresh the /app/wave page next time user visits
    revalidatePath('/app/wave')

    // STEP 11: Success!
    // Return upload ID so client knows which file to extract
    return { success: true, uploadId: data.id }
  } catch (error) {
    // UNEXPECTED ERROR
    // Log full details to server logs for debugging
    // But return generic message to client (don't expose internals)
    console.error('Upload error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
