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
 */
export async function saveProductWave(
  waveId: string,
  data: Partial<ProductData>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 0. Validate input shape and field limits
    const validation = validateProductDataSafe(data)
    if (!validation.success) {
      logger.warn('📝 review', 'Invalid product data', { error: validation.error, waveId })
      return { success: false, error: 'Invalid product data: ' + validation.error }
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

    logger.info('💾 review', 'Saving product wave', { waveId, userId: user.id })

    // 2. Update with ownership check (profile_id + waveId)
    const { error: updateError } = await supabase
      .from('product_waves')
      .update({ extracted_data: validation.data })
      .eq('id', waveId)
      .eq('profile_id', user.id) // Double-check ownership

    if (updateError) {
      logger.error('💾 review', 'Failed to save', new Error(updateError.message), { waveId, userId: user.id })
      return { success: false, error: 'Failed to save changes' }
    }

    logger.info('✅ review', 'Product wave saved successfully', { waveId, userId: user.id })
    return { success: true }
  } catch (error) {
    logger.error('❌ review', 'Error saving product wave', error instanceof Error ? error : new Error(String(error)), { waveId })
    return { success: false, error: 'An unexpected error occurred' }
  }
}
