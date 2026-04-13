'use server'

import { createServerClient } from '@/lib/supabase-server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

/**
 * SERVER ACTION: uploadFile
 * =========================
 *
 * Securely uploads supplier PDFs/images and creates database records.
 *
 * FLOW:
 * 1. Validate file type (PDF or image only) and size (max 10MB)
 * 2. Authenticate user (verify session)
 * 3. Check rate limit (max 100 uploads/hour)
 * 4. Upload file to Supabase Storage under user's folder
 * 5. Create database record in uploads table
 * 6. Return upload ID for extraction step
 *
 * ERROR HANDLING:
 * Returns generic errors to client, logs details server-side.
 *
 * @param formData - FormData with 'file' field
 * @returns { success: true, uploadId } or { error: string }
 */
export async function uploadFile(formData: FormData) {
  const timer = logger.timer('📤 upload', 'uploadFile')

  try {
    // 1. Check file exists
    const file = formData.get('file') as File
    if (!file) {
      logger.warn('📤 upload', 'No file in upload request')
      return { error: 'No file provided' }
    }

    // 2. Validate file type
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      logger.warn('📤 upload', 'Invalid file type', { fileType: file.type })
      return { error: 'Only PDF and image files are supported' }
    }

    // 3. Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      logger.warn('📤 upload', 'File too large', { fileSize: file.size, maxSize })
      return { error: 'File size must be less than 10MB' }
    }

    // 4. Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('📤 upload', 'Unauthorized upload attempt', { authError: authError?.message })
      return { error: 'Not authenticated' }
    }

    logger.info('📤 upload', 'Upload started', { userId: user.id })

    // 5. Check rate limit
    try {
      const { remaining } = enforceRateLimit(user.id, 'upload')
      logger.info('📤 upload', 'Rate limit check passed', { remaining })
    } catch (rateLimitError) {
      logger.warn('⏱️ upload', 'Rate limit exceeded', rateLimitError instanceof Error ? rateLimitError : new Error(String(rateLimitError)))
      return { error: 'Too many uploads. Please try again in an hour.' }
    }

    // 6. Generate filename and path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // 7. Upload to Supabase Storage
    logger.info('📤 upload', 'Uploading to storage', { filePath, fileSize: file.size, fileType: file.type })

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type,
      })

    if (uploadError) {
      logger.error('🗂️ upload', 'Storage upload failed', new Error(uploadError.message), { filePath })
      return { error: 'Failed to upload file. Please try again.' }
    }

    logger.info('🗂️ upload', 'File stored successfully', { filePath })

    // 8. Create database record
    const { data: dbData, error: dbError } = await supabase
      .from('uploads')
      .insert({
        profile_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: isImage ? 'image' : 'pdf',
      })
      .select('id')
      .single()

    if (dbError || !dbData) {
      logger.error('💾 upload', 'Failed to create upload record', new Error(dbError?.message || 'Unknown error'), { filePath })
      return { error: 'Failed to save upload. Please try again.' }
    }

    // 9. Revalidate cache and return
    revalidatePath('/app/wave')
    logger.info('✅ upload', 'Upload complete', { uploadId: dbData.id, filePath })

    timer.end({ success: true, uploadId: dbData.id })
    return { success: true, uploadId: dbData.id }
  } catch (error) {
    logger.error('❌ upload', 'Unexpected error', error instanceof Error ? error : new Error(String(error)))
    timer.error(error instanceof Error ? error : new Error(String(error)))
    return { error: 'An unexpected error occurred' }
  }
}
