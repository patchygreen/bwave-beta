'use server'

import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { enforceRateLimit } from '@/lib/rate-limit'
import type { ProductData } from '@/lib/types'

/**
 * SERVER ACTION: exportCSV
 * =========================
 *
 * Converts extracted ProductData to Shopify-compatible CSV format
 * and uploads to storage for download.
 *
 * FLOW:
 * 1. Authenticate user
 * 2. Fetch ProductData from product_waves table
 * 3. Convert to Shopify CSV (handles variants: size × color)
 * 4. Upload CSV to Supabase Storage
 * 5. Create csv_exports record for audit trail
 * 6. Return signed download URL
 *
 * CSV FORMAT:
 * - Header row: Handle, Title, Vendor, Type, Body (HTML), Tags, Price, Compare At Price, Option1 Name, Option1 Value, Option2 Name, Option2 Value
 * - Data rows: one per (size × color) variant combination
 * - If no sizes/colors: single row with empty option fields
 *
 * @param waveId - ID of product_waves record to export
 * @returns { success: true, url: signedDownloadUrl } or { success: false, error: message }
 */
export async function exportCSV(waveId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const timer = logger.timer('📊 export', 'exportCSV')

  try {
    // 1. Authenticate user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('📊 export', 'Unauthorized export attempt', { waveId })
      return { success: false, error: 'Not authenticated' }
    }

    // Rate limit check: max 50 exports per hour
    try {
      const { remaining } = enforceRateLimit(user.id, 'export')
      logger.info('📊 export', 'Export started', { waveId, userId: user.id, remaining })
    } catch (rateLimitError) {
      logger.warn('⏱️ export', 'Rate limit exceeded', rateLimitError instanceof Error ? rateLimitError : new Error(String(rateLimitError)))
      return { success: false, error: 'Too many exports. Please try again in an hour.' }
    }

    // 2. Fetch product data from database
    const { data: wave, error: waveError } = await supabase
      .from('product_waves')
      .select('*')
      .eq('id', waveId)
      .eq('profile_id', user.id)
      .single()

    if (waveError || !wave) {
      logger.error('📊 export', 'Wave not found', new Error(waveError?.message || 'Unknown error'), { waveId })
      return { success: false, error: 'Product wave not found' }
    }

    const productData = wave.extracted_data as ProductData

    // 3. Generate Shopify CSV
    const csvContent = productDataToShopifyCSV(productData)

    // 4. Upload CSV to storage
    const handle = productData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const fileName = `${handle}-${Date.now()}.csv`
    const filePath = `${user.id}/${fileName}`

    const csvBlob = new Blob([csvContent], { type: 'text/csv' })

    // Use service role client to bypass RLS (same as extract.ts for file operations)
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: uploadError } = await serviceRoleClient.storage
      .from('csv-exports')
      .upload(filePath, csvBlob, {
        contentType: 'text/csv',
        upsert: false,
      })

    if (uploadError) {
      logger.error('📊 export', 'CSV upload failed', new Error(uploadError.message), { waveId, filePath })
      return { success: false, error: 'Failed to upload CSV' }
    }

    // 5. Create audit record
    const { data: exportRecord, error: insertError } = await supabase
      .from('csv_exports')
      .insert({
        wave_id: waveId,
        profile_id: user.id,
        csv_path: filePath,
      })
      .select()
      .single()

    if (insertError || !exportRecord) {
      logger.error('📊 export', 'Failed to create export record', new Error(insertError?.message || 'Unknown error'), {
        waveId,
      })
      return { success: false, error: 'Failed to create export record' }
    }

    // 6. Create signed download URL
    const { data: signedUrlData, error: urlError } = await serviceRoleClient.storage
      .from('csv-exports')
      .createSignedUrl(filePath, 3600)

    if (urlError || !signedUrlData?.signedUrl) {
      logger.error('📊 export', 'Failed to create signed URL', new Error(urlError?.message || 'Unknown error'), {
        waveId,
        filePath,
      })
      return { success: false, error: 'Failed to create download URL' }
    }

    // 7. Revalidate cache
    revalidatePath('/app/dashboard')
    revalidatePath(`/app/review/${waveId}`)

    logger.info('📊 export', 'Export complete', { waveId, fileName, recordId: exportRecord.id })
    timer.end({ success: true })

    return { success: true, url: signedUrlData.signedUrl }
  } catch (error) {
    logger.error('📊 export', 'Unexpected error during export', error instanceof Error ? error : new Error(String(error)), {
      waveId,
    })
    timer.end({ success: false })
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Convert ProductData to Shopify-compatible CSV format
 *
 * Shopify columns:
 * Handle, Title, Vendor, Type, Body (HTML), Tags, Published,
 * Price, Compare At Price, Option1 Name, Option1 Value, Option2 Name, Option2 Value
 *
 * Variant handling:
 * - Creates one row per (size × color) combination
 * - If no sizes/colors: single row with empty option fields
 *
 * @param data - ProductData to convert
 * @returns CSV string (ready to upload)
 */
function productDataToShopifyCSV(data: ProductData): string {
  // Header row with Shopify columns
  const headers = [
    'Handle',
    'Title',
    'Vendor',
    'Type',
    'Body (HTML)',
    'Tags',
    'Published',
    'Price',
    'Compare At Price',
    'Option1 Name',
    'Option1 Value',
    'Option2 Name',
    'Option2 Value',
  ]

  const rows: string[][] = [headers]

  // Generate handle from title (e.g., "T-Shirt" → "t-shirt")
  const titleStr = data.title ?? 'untitled'
  const handle = titleStr
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 255)

  // Get size/color variants (or null if none)
  const sizes = data.sizes && data.sizes.length > 0 ? data.sizes : [null]
  const colors = data.colors && data.colors.length > 0 ? data.colors : [null]

  // Generate variant rows (Cartesian product: each size × each color)
  for (const size of sizes) {
    for (const color of colors) {
      const row: string[] = [
        handle, // Handle
        titleStr, // Title
        data.vendor || '', // Vendor
        data.product_type || '', // Type
        data.description || '', // Body (HTML)
        data.tags?.join(', ') || '', // Tags (comma-separated)
        'true', // Published
        data.price || '', // Price
        data.compare_at_price || '', // Compare At Price
        size ? 'Size' : '', // Option1 Name
        size || '', // Option1 Value
        color ? 'Color' : '', // Option2 Name
        color || '', // Option2 Value
      ]

      rows.push(row)
    }
  }

  // Convert rows to CSV with proper escaping
  // CSV escaping: wrap in quotes if contains comma/quote/newline, escape quotes as ""
  const csvLines = rows.map((row) =>
    row
      .map((cell) => {
        if (!cell) return ''
        const str = String(cell)
        // Check if cell needs quoting
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          // Escape quotes by doubling them
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  )

  return csvLines.join('\n')
}
