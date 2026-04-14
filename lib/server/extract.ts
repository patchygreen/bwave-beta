'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { enforceRateLimit, refundRateLimit } from '@/lib/rate-limit'
import { validateProductDataSafe } from '@/lib/validation/schemas'
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        type: 'document' as const,
        source: {
          type: 'url' as const,
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

If the document contains multiple products, extract data for ALL products.

Extract ALL available fields from the document and return ONLY valid JSON (no markdown, no explanations).

JSON schema to follow (return as object for single product, or array of objects for multiple):
{
  "title": "Product name/title",
  "vendor": "Supplier/brand/vendor name",
  "product_type": "Product category or type",
  "description": "Full product description, specifications, features",
  "price": "Regular selling price",
  "compare_at_price": "Original/compare-at price if on sale",
  "sizes": ["XXS", "XS", "S", "M", "L", "XL", "XXL"],
  "colors": ["color1", "color2"],
  "quantities": {"XXS": 2, "XS": 4, "S": 4, "M": 4, "L": 3},
  "materials": "Material composition and details",
  "care_instructions": "Washing, care, and maintenance instructions",
  "size_fit": "Sizing guidance, fit notes, measurement chart references",
  "tags": ["category", "tags", "for", "shopify"],
  "images": ["array", "of", "image", "URLs", "if", "available"]
}

Rules:
- If multiple products: return JSON array of objects
- If single product: return JSON object (NOT in an array)
- If a field is not present in the document, omit it or use null
- For quantities: CRITICAL - Extract per-size inventory/stock quantities from supplier documents. Quantities can appear in different formats:
  FORMAT 1 - Invoice/Order style (each size is a separate line item):
  * Product codes like "NE7124-L", "NE7124-M", "NE7124-S" where the last letter is the SIZE
  * The Quantity column shows how many of that size: NE7124-L qty 4 = size L has 4 units
  * Extract the SIZE letter from the code, use the Quantity value: {"L": 4, "M": 5, "S": 4}
  FORMAT 2 - Catalog style (sizes in row/columns):
  * Table row: "XXS: 2 | XS: 4 | S: 4" → return {"XXS": 2, "XS": 4, "S": 4}
  * Table columns: Size row shows "L M S" and Quantity row shows "4 5 4" → return {"L": 4, "M": 5, "S": 4}
  * Include EVERY size that has a corresponding quantity number
  * Return as object {"size_label": number_value}
- For images: if the document has embedded images, describe them in a way that could be used as image alt text
- For arrays: return as arrays, not comma-separated strings
- Do not include any markdown formatting or code blocks
- All prices should be strings (preserve formatting like currency symbols)
- Tags should be lowercase and single words`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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

    logger.debug('🔍 extraction', 'Claude response (first 500 chars)', { responsePreview: jsonString.substring(0, 500) })

    let extractedData: Partial<ProductData> | Partial<ProductData>[]
    try {
      let parsed = JSON.parse(jsonString)
      logger.debug('✅ extraction', 'JSON parsed successfully', { uploadId })

      // Handle case where Claude returns array of products (multi-product invoices)
      if (Array.isArray(parsed)) {
        logger.info('🌊 extraction', 'Multi-product extraction detected', { uploadId, productCount: parsed.length })
        if (parsed.length === 0) {
          return { success: false, error: 'No products found in document' }
        }

        // Validate each product in the array
        const validatedProducts: Partial<ProductData>[] = []
        for (const product of parsed) {
          const validation = validateProductDataSafe(product)
          if (!validation.success) {
            logger.warn('📝 extraction', 'Product failed validation, skipping', { error: validation.error })
            continue
          }
          validatedProducts.push(validation.data || product)
        }

        if (validatedProducts.length === 0) {
          return { success: false, error: 'No valid products found in document' }
        }

        extractedData = validatedProducts
      } else {
        // Single product case
        const validation = validateProductDataSafe(parsed)
        if (!validation.success) {
          logger.error('📝 extraction', 'Claude response failed validation', new Error(validation.error || 'Invalid schema'), {
            uploadId,
            responsePreview: JSON.stringify(parsed).substring(0, 200),
          })
          return { success: false, error: 'Failed to validate extraction results' }
        }
        extractedData = validation.data || parsed
      }
    } catch (parseError) {
      logger.error('❌ extraction', 'Failed to parse Claude response as JSON', parseError instanceof Error ? parseError : new Error(String(parseError)), {
        uploadId,
        responsePreview: responseText.substring(0, 200),
      })
      return { success: false, error: 'Failed to parse extraction results' }
    }

    // Check if extracted data is empty (no useful fields)
    const dataArray = Array.isArray(extractedData) ? extractedData : [extractedData]
    const hasData = dataArray.some(product => Object.values(product).some((val) => val && val !== '' && !Array.isArray(val) ? true : Array.isArray(val) && val.length > 0))
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

    const productCount = Array.isArray(extractedData) ? extractedData.length : 1
    logger.info('✅ extraction', 'Extraction complete and stored', {
      uploadId,
      waveId: waveData.id,
      fileName: upload.file_name,
      productCount,
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
