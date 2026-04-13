'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { enforceRateLimit, refundRateLimit } from '@/lib/rate-limit'
import type { ProductData } from '@/lib/types'

// Create a service role client for reading files (bypasses storage RLS)
function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Extract product data from uploaded file using Claude Vision API
 *
 * FLOW:
 * 1. Authenticate user (verify they own this upload)
 * 2. Get upload metadata from database
 * 3. Download file from Supabase Storage or get signed URL
 * 4. Send to Claude Vision with ProductData extraction prompt
 * 5. Parse JSON response as ProductData
 * 6. Insert extracted data into product_waves table
 * 7. Return waveId for redirect to review page
 *
 * ERROR HANDLING:
 * Any failure (auth, file not found, Claude error, parse error, DB error)
 * throws an error which the client catches and displays
 */
export async function extractProducts(uploadId: string): Promise<{ success: boolean; waveId?: string; error?: string }> {
  const timer = logger.timer('🚀 extraction', 'extractProducts')

  try {
    // 1. AUTHENTICATE & VERIFY OWNERSHIP
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('🔐 extraction', 'Unauthorized extraction attempt - no user session')
      return { success: false, error: 'Not authenticated' }
    }

    // Rate limit check: max 10 extractions per hour
    try {
      const { remaining } = enforceRateLimit(user.id, 'extraction')
      logger.info('📤 extraction', 'Starting extraction', { uploadId, userId: user.id, remaining })
    } catch (rateLimitError) {
      logger.warn('⏱️ extraction', 'Rate limit exceeded', rateLimitError instanceof Error ? rateLimitError : new Error(String(rateLimitError)))
      return { success: false, error: 'Too many extractions. Please try again in an hour.' }
    }

    // 2. FETCH UPLOAD METADATA
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('profile_id', user.id)
      .single()

    if (uploadError || !upload) {
      logger.error('📄 extraction', 'Upload not found or unauthorized', new Error('Upload not found'), { uploadId })
      return { success: false, error: 'Upload not found' }
    }

    logger.info('📄 extraction', 'Upload metadata fetched', {
      uploadId,
      fileName: upload.file_name,
      fileType: upload.file_type,
      filePath: upload.file_path,
    })

    // 3. PREPARE FILE FOR CLAUDE
    // Claude supports:
    // - Images (JPEG, PNG, GIF, WebP): via URL or base64
    // - PDFs: via URL only as type 'document'
    const serviceRoleClient = createServiceRoleClient()
    const isPdf = upload.file_type === 'pdf'

    let contentBlock: any

    if (isPdf) {
      // PDFs must use signed URL with type 'document'
      const { data: signedUrlData, error: urlError } = await serviceRoleClient.storage
        .from('uploads')
        .createSignedUrl(upload.file_path, 3600)

      if (urlError || !signedUrlData?.signedUrl) {
        logger.error('🔗 extraction', 'Failed to create signed URL', new Error(urlError?.message || 'Unknown error'), {
          uploadId,
          filePath: upload.file_path,
        })
        return { success: false, error: 'Failed to access file' }
      }

      contentBlock = {
        type: 'document',
        source: {
          type: 'url',
          url: signedUrlData.signedUrl,
        },
      }
    } else {
      // Images use base64
      const { data: fileBuffer, error: downloadError } = await serviceRoleClient.storage
        .from('uploads')
        .download(upload.file_path)

      if (downloadError || !fileBuffer) {
        logger.error('🔗 extraction', 'Failed to download image', new Error(downloadError?.message || 'Unknown error'), {
          uploadId,
          filePath: upload.file_path,
        })
        return { success: false, error: 'Failed to access file' }
      }

      let base64String: string
      if (fileBuffer instanceof Blob) {
        const arrayBuffer = await fileBuffer.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        base64String = buffer.toString('base64')
      } else {
        base64String = Buffer.from(fileBuffer).toString('base64')
      }

      // Determine correct media type from file extension
      const ext = upload.file_name.toLowerCase().split('.').pop()
      const mediaTypeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      }
      const mediaType = mediaTypeMap[ext || ''] || 'image/jpeg'

      contentBlock = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64String,
        },
      }
    }

    // 4. CALL CLAUDE VISION API
    logger.info('🤖 extraction', 'Calling Claude Vision API', { uploadId, fileType: upload.file_type })

    const claudeTimer = logger.timer('🤖 extraction', 'claudeVisionCall')

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const claudePrompt = `You are extracting product data from a supplier PDF or product image for import into Shopify.

Extract ALL available fields from the document and return ONLY a valid JSON object (no markdown, no explanations).

JSON schema to follow:
{
  "title": "Product name/title",
  "vendor": "Supplier/brand/vendor name",
  "product_type": "Product category or type",
  "description": "Full product description, specifications, features",
  "price": "Regular selling price",
  "compare_at_price": "Original/compare-at price if on sale",
  "sizes": ["array", "of", "available", "sizes"],
  "colors": ["array", "of", "available", "colors"],
  "materials": "Material composition and details",
  "care_instructions": "Washing, care, and maintenance instructions",
  "size_fit": "Sizing guidance, fit notes, measurement chart references",
  "tags": ["category", "tags", "for", "shopify"],
  "images": ["array", "of", "image", "URLs", "if", "available"]
}

Rules:
- Return ONLY the JSON object, nothing else
- If a field is not present in the document, omit it or use null
- For images: if the document has embedded images, describe them in a way that could be used as image alt text
- For arrays: return as arrays, not comma-separated strings
- Do not include any markdown formatting or code blocks
- All prices should be strings (preserve formatting like currency symbols)
- Tags should be lowercase and single words`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: claudePrompt,
            },
          ],
        },
      ],
    })

    claudeTimer.end({ success: true })

    // 5. EXTRACT TEXT AND PARSE JSON
    const responseText = response.content.find((block) => block.type === 'text')?.text

    if (!responseText) {
      logger.error('📝 extraction', 'Claude returned no text response', new Error('Empty response'), { uploadId })
      return { success: false, error: 'Failed to extract data' }
    }

    // Parse JSON - Claude might include markdown code blocks, so strip them
    let jsonString = responseText.trim()
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    let extractedData: Partial<ProductData>
    try {
      extractedData = JSON.parse(jsonString)
      logger.debug('✅ extraction', 'JSON parsed successfully', { uploadId })
    } catch (parseError) {
      logger.error('❌ extraction', 'Failed to parse Claude response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)), {
        uploadId,
        responsePreview: responseText.substring(0, 200),
      })
      return { success: false, error: 'Failed to parse extraction results' }
    }

    // Check if extracted data is empty (no useful fields)
    const hasData = Object.values(extractedData).some((val) => val && val !== '' && !Array.isArray(val) ? true : Array.isArray(val) && val.length > 0)
    if (!hasData) {
      logger.warn('⚠️ extraction', 'No product data extracted from file', { uploadId, fileName: upload.file_name })

      // Refund the extraction rate limit since Claude call was wasted on a useless file
      refundRateLimit(user.id, 'extraction')
      logger.info('♻️ extraction', 'Refunded extraction rate limit (no data found)', { userId: user.id })

      return {
        success: false,
        error: 'Could not extract product information from this file. Make sure it contains product details like title, description, price, or images.',
      }
    }

    // 6. INSERT INTO product_waves TABLE
    const { data: waveData, error: insertError } = await supabase
      .from('product_waves')
      .insert({
        upload_id: uploadId,
        profile_id: user.id,
        extracted_data: extractedData,
      })
      .select('id')
      .single()

    if (insertError || !waveData) {
      logger.error('💾 extraction', 'Failed to insert product wave', new Error(insertError?.message || 'Unknown error'), {
        uploadId,
      })
      return { success: false, error: 'Failed to save extraction results' }
    }

    logger.info('✅ extraction', 'Extraction complete and stored', {
      uploadId,
      waveId: waveData.id,
      fileName: upload.file_name,
    })

    timer.end({ success: true, waveId: waveData.id })

    return { success: true, waveId: waveData.id }
  } catch (error) {
    logger.error('❌ extraction', 'Unexpected error during extraction', error instanceof Error ? error : new Error(String(error)), {
      uploadId,
    })
    timer.error(error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: 'An unexpected error occurred' }
  }
}
