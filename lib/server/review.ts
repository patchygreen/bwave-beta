'use server'

import { createServerClient } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { validateProductDataSafe } from '@/lib/validation/schemas'
import type { ProductData } from '@/lib/types'

/**
 * Save extracted product data back to product_waves
 * Called from review page when user confirms edits
 *
 * Validates input before database write to prevent malformed data
 * Supports both single product and multi-product arrays
 */
export async function saveProductWave(
  waveId: string,
  data: Partial<ProductData> | Partial<ProductData>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 0. Validate input shape and field limits
    // Handle both single object and array of objects
    const dataToValidate = Array.isArray(data) ? data : [data]
    for (const product of dataToValidate) {
      const validation = validateProductDataSafe(product)
      if (!validation.success) {
        logger.warn('📝 review', 'Invalid product data', { error: validation.error, waveId })
        return { success: false, error: 'Invalid product data: ' + validation.error }
      }
    }

    // 1. Authenticate
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('🔐 review', 'Unauthorized save attempt - no user session')
      return { success: false, error: 'Not authenticated' }
    }

    const productCount = Array.isArray(data) ? data.length : 1
    logger.info('💾 review', 'Saving product wave', { waveId, userId: user.id, productCount })

    // 2. Update with ownership check (profile_id + waveId)
    const { error: updateError } = await supabase
      .from('product_waves')
      .update({ extracted_data: data })
      .eq('id', waveId)
      .eq('profile_id', user.id) // Double-check ownership

    if (updateError) {
      logger.error('💾 review', 'Failed to save', new Error(updateError.message), { waveId, userId: user.id })
      return { success: false, error: 'Failed to save changes' }
    }

    logger.info('✅ review', 'Product wave saved successfully', { waveId, userId: user.id, productCount })
    return { success: true }
  } catch (error) {
    logger.error('❌ review', 'Error saving product wave', error instanceof Error ? error : new Error(String(error)), { waveId })
    return { success: false, error: 'An unexpected error occurred' }
  }
}
