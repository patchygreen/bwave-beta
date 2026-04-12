'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import type { ProductData } from '@/lib/types'

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

    logger.info('📤 extraction', 'Starting extraction', { uploadId, userId: user.id })

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
    })

    // 3. GET SIGNED URL FOR FILE FROM STORAGE
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('uploads')
      .createSignedUrl(upload.file_path, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error('🔗 extraction', 'Failed to create signed URL', new Error(signedUrlError?.message || 'Unknown error'), {
        uploadId,
        filePath: upload.file_path,
      })
      return { success: false, error: 'Failed to access file' }
    }

    logger.debug('🔗 extraction', 'Signed URL created', { uploadId })

    // 4. PREPARE CLAUDE PROMPT WITH SCHEMA
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

    // 5. CALL CLAUDE VISION API
    logger.info('🤖 extraction', 'Calling Claude Vision API', { uploadId, fileType: upload.file_type })

    const claudeTimer = logger.timer('🤖 extraction', 'claudeVisionCall')

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: signedUrlData.signedUrl,
              },
            },
            {
              type: 'text',
              text: claudePrompt,
            },
          ],
        },
      ],
    })

    claudeTimer.end({ success: true })

    // 6. EXTRACT TEXT AND PARSE JSON
    const responseText = response.content.find((block) => block.type === 'text')?.text

    if (!responseText) {
      logger.error('📝 extraction', 'Claude returned no text response', new Error('Empty response'), { uploadId })
      return { success: false, error: 'Failed to extract data' }
    }

    logger.debug('📝 extraction', 'Claude response received', { uploadId, responseLength: responseText.length })

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

    // 7. INSERT INTO product_waves TABLE
    logger.info('💾 extraction', 'Inserting extracted data into database', { uploadId })

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
