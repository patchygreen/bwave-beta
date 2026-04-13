/**
 * Input Validation Schemas
 *
 * Zod schemas for validating user input at system boundaries.
 * Prevents malformed data from reaching the database.
 */

import { z } from 'zod'

/**
 * Product data schema (matches ProductData type)
 * Used for review page saves and extraction results
 */
export const ProductDataSchema = z.object({
  title: z.string().min(1).max(255).nullable().optional(),
  vendor: z.string().max(255).nullable().optional(),
  product_type: z.string().max(255).nullable().optional(),
  description: z.string().max(50000).nullable().optional(),
  price: z.string().max(100).nullable().optional(),
  compare_at_price: z.string().max(100).nullable().optional(),
  sizes: z.array(z.string().max(100)).max(100).nullable().optional(),
  colors: z.array(z.string().max(100)).max(100).nullable().optional(),
  materials: z.string().max(5000).nullable().optional(),
  care_instructions: z.string().max(5000).nullable().optional(),
  size_fit: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().max(100)).max(100).nullable().optional(),
  images: z.array(z.string().max(2048)).max(100).nullable().optional(),
})

export type ValidatedProductData = z.infer<typeof ProductDataSchema>

/**
 * Validate and sanitize product data
 * @throws ZodError if validation fails
 */
export function validateProductData(data: unknown): ValidatedProductData {
  return ProductDataSchema.parse(data)
}

/**
 * Safe validation that returns error message instead of throwing
 */
export function validateProductDataSafe(data: unknown): {
  success: boolean
  data?: ValidatedProductData
  error?: string
} {
  try {
    const validated = ProductDataSchema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return { success: false, error: `Validation failed: ${messages}` }
    }
    return { success: false, error: 'Validation error' }
  }
}

/**
 * File upload metadata validation
 */
export const FileMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().min(1).max(10 * 1024 * 1024), // Max 10MB
  fileType: z.enum(['pdf', 'image']),
})

export type ValidatedFileMetadata = z.infer<typeof FileMetadataSchema>

/**
 * CSV generation request validation
 */
export const GenerateCSVRequestSchema = z.object({
  waveId: z.string().uuid(),
})

export type GenerateCSVRequest = z.infer<typeof GenerateCSVRequestSchema>
