/**
 * Tests for extractProducts server action
 *
 * Validates:
 * - User authentication check
 * - Upload existence and ownership
 * - Claude Vision API call
 * - JSON parsing from response
 * - Database insertion
 * - Error handling for all failure scenarios
 */

import { extractProducts } from '@/lib/server/extract'
import type { ProductData } from '@/lib/types'

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase-server', () => ({
  createServerClient: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    timer: jest.fn(() => ({
      end: jest.fn(),
      error: jest.fn(),
    })),
  },
}))

describe('extractProducts', () => {
  let mockSupabase: any
  let mockAnthropic: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
    }

    // Mock Anthropic
    mockAnthropic = {
      messages: {
        create: jest.fn(),
      },
    }

    // Setup imports
    const { createServerClient } = require('@/lib/supabase-server')
    const Anthropic = require('@anthropic-ai/sdk').default

    createServerClient.mockResolvedValue(mockSupabase)
    Anthropic.mockReturnValue(mockAnthropic)

    // Default mock implementations
    process.env.ANTHROPIC_API_KEY = 'sk-test-key'
  })

  describe('Authentication', () => {
    it('returns error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('checks user owns the upload', async () => {
      const userId = 'user-123'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
      })

      // Mock upload query
      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload not found')
      expect(mockUploadQuery.eq).toHaveBeenCalledWith('profile_id', userId)
    })
  })

  describe('File Access', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })
    })

    it('returns error when upload not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      const result = await extractProducts('nonexistent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload not found')
    })

    it('returns error when signed URL creation fails', async () => {
      // Mock successful upload fetch
      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'upload-123',
            file_path: 'user-123/file.pdf',
            file_name: 'file.pdf',
            file_type: 'pdf',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      // Mock failed signed URL
      const mockStorageFrom = {
        createSignedUrl: jest
          .fn()
          .mockResolvedValue({
            data: null,
            error: { message: 'Failed to create URL' },
          }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to access file')
    })
  })

  describe('Claude Vision API', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      // Mock successful upload fetch
      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'upload-123',
            file_path: 'user-123/file.pdf',
            file_name: 'file.pdf',
            file_type: 'pdf',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      // Mock successful signed URL
      const mockStorageFrom = {
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.url/file.pdf' },
          error: null,
        }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)
    })

    it('calls Claude with image URL and extraction prompt', async () => {
      const mockProductData: ProductData = {
        title: 'Test Product',
        vendor: 'Test Vendor',
        product_type: 'Clothing',
        description: 'A test product',
        price: '$99.99',
        compare_at_price: '',
        sizes: ['S', 'M', 'L'],
        colors: ['Red', 'Blue'],
        materials: 'Cotton',
        care_instructions: 'Wash cold',
        size_fit: 'True to size',
        tags: ['clothing', 'test'],
        images: [],
      }

      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockProductData),
          },
        ],
      })

      // Mock database insert
      const mockWaveQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'wave-123' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'upload-123',
              file_path: 'user-123/file.pdf',
              file_name: 'file.pdf',
              file_type: 'pdf',
            },
          }),
        }),
        insert: jest.fn().mockReturnValue(mockWaveQuery),
      })

      const result = await extractProducts('upload-123')

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image',
                  source: expect.objectContaining({
                    type: 'url',
                    url: 'https://signed.url/file.pdf',
                  }),
                }),
                expect.objectContaining({
                  type: 'text',
                }),
              ]),
            }),
          ]),
        })
      )
    })

    it('returns error when Claude returns empty text', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [],
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to extract data')
    })
  })

  describe('JSON Parsing', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'upload-123',
            file_path: 'user-123/file.pdf',
            file_name: 'file.pdf',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      const mockStorageFrom = {
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.url/file.pdf' },
          error: null,
        }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)
    })

    it('parses JSON with markdown formatting', async () => {
      const jsonData = { title: 'Product', vendor: 'Brand' }

      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `\`\`\`json\n${JSON.stringify(jsonData)}\n\`\`\``,
          },
        ],
      })

      const mockWaveQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'wave-123' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'upload-123', file_path: 'user-123/file.pdf' },
          }),
        }),
        insert: jest.fn().mockReturnValue(mockWaveQuery),
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(true)
      expect(result.waveId).toBe('wave-123')
    })

    it('returns error for invalid JSON', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON',
          },
        ],
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to parse extraction results')
    })
  })

  describe('Database Storage', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'upload-123',
            file_path: 'user-123/file.pdf',
            file_name: 'file.pdf',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      const mockStorageFrom = {
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.url/file.pdf' },
          error: null,
        }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)
    })

    it('inserts extracted data into product_waves table', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockData = { title: 'Product', vendor: 'Brand' }

      // Mock upload fetch
      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'upload-123', file_path: 'user-123/file.pdf' },
          error: null,
        }),
      }

      // Mock storage
      const mockStorageFrom = {
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.url/file.pdf' },
          error: null,
        }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)

      // Mock Claude
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockData) }],
      })

      // Mock wave insert
      const mockWaveQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'wave-123' },
          error: null,
        }),
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'product_waves') {
          return mockWaveQuery
        }
        return {
          select: jest.fn().mockReturnValue(mockUploadQuery),
        }
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(true)
      expect(result.waveId).toBe('wave-123')
    })

    it('returns error when database insert fails', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '{"title":"Product"}' }],
      })

      const mockWaveQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'upload-123', file_path: 'user-123/file.pdf' },
          }),
        }),
        insert: jest.fn().mockReturnValue(mockWaveQuery),
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to save extraction results')
    })
  })

  describe('Success Flow', () => {
    it('successfully extracts and stores product data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const mockUploadQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'upload-123',
            file_path: 'user-123/product.pdf',
            file_name: 'product.pdf',
          },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
      })

      const mockStorageFrom = {
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://signed.url/product.pdf' },
          error: null,
        }),
      }

      mockSupabase.storage.from.mockReturnValue(mockStorageFrom)

      const productData: ProductData = {
        title: 'Premium Widget',
        vendor: 'Widget Corp',
        product_type: 'Hardware',
        description: 'A premium widget for all your needs',
        price: '$49.99',
        compare_at_price: '$99.99',
        sizes: [],
        colors: ['Silver', 'Black'],
        materials: 'Aluminum',
        care_instructions: 'Clean with soft cloth',
        size_fit: 'Universal fit',
        tags: ['hardware', 'premium'],
        images: [],
      }

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(productData) }],
      })

      const mockWaveQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'wave-789' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockUploadQuery),
        insert: jest.fn().mockReturnValue(mockWaveQuery),
      })

      const result = await extractProducts('upload-123')

      expect(result.success).toBe(true)
      expect(result.waveId).toBe('wave-789')
      expect(result.error).toBeUndefined()
    })
  })
})
