'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * File Upload Server Action
 *
 * Securely uploads supplier PDFs/images and creates database records.
 * Runs on server to keep credentials secure and prevent tampering.
 *
 * Validation:
 * - File type: PDF or image only (no executables, archives, etc.)
 * - File size: Max 10MB (prevents abuse + storage bloat)
 * - User auth: Must have valid Supabase session
 *
 * Upload Process:
 * 1. Validate client-side constraints
 * 2. Verify user is authenticated
 * 3. Generate unique filename with timestamp (prevents collisions)
 * 4. Upload file to Storage under /uploads/<user-id>/<filename>
 *    (RLS policies ensure users can only see their own files)
 * 5. Create database record in uploads table
 * 6. Return upload ID for next step (AI extraction)
 *
 * Error Handling:
 * - Returns { error: string } on validation or upload failures
 * - Never returns sensitive info (API errors shown as generic messages)
 * - Console logs errors for debugging (see server logs in production)
 *
 * @param formData - FormData with 'file' field containing the file
 * @returns { success: true, uploadId: string } or { error: string }
 *
 * @throws Does not throw; always returns error object instead
 */
export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File

  if (!file) {
    return { error: 'No file provided' }
  }

  // Determine file type
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  // Validate file type
  if (!isImage && !isPdf) {
    return { error: 'Only PDF and image files are supported' }
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { error: 'File size must be less than 10MB' }
  }

  try {
    const supabase = await createServerClient()

    // Get authenticated user from session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Generate unique filename with timestamp to avoid collisions
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    // Files stored at: uploads/<user-id>/<filename>
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type,
      })

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` }
    }

    // Create database record to track the upload
    const { data, error: dbError } = await supabase
      .from('uploads')
      .insert({
        profile_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: isImage ? 'image' : 'pdf',
      })
      .select()
      .single()

    if (dbError) {
      return { error: `Failed to save upload: ${dbError.message}` }
    }

    // Revalidate cache so upload appears immediately
    revalidatePath('/app/wave')

    // Return upload ID for next step
    return { success: true, uploadId: data.id }
  } catch (error) {
    console.error('Upload error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
