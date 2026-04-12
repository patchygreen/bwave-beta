'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File

  if (!file) {
    return { error: 'No file provided' }
  }

  // Validate file type
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Upload file to Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type,
      })

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` }
    }

    // Save upload record to database
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

    revalidatePath('/app/wave')
    return { success: true, uploadId: data.id }
  } catch (error) {
    console.error('Upload error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
