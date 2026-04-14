'use client'

import { useEffect, useState, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import type { ProductData } from '@/lib/types'

interface ProductCarouselProps {
  products: ProductData[]
  onUpdate: (index: number, data: Partial<ProductData>) => void
  onAllReviewed: (callback: () => boolean) => void
}

export function ProductCarousel({ products, onUpdate, onAllReviewed }: ProductCarouselProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [emblaRef, emblaApi] = useEmblaCarousel() as any
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(new Set())
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  // Update carousel state
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedIndex())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())

    // Mark as reviewed when viewing
    setReviewedIndices((prev) => new Set(prev).add(emblaApi.selectedIndex()))
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        emblaApi?.scrollPrev()
      } else if (e.key === 'ArrowRight') {
        emblaApi?.scrollNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [emblaApi])

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()

  const isFullyReviewed = reviewedIndices.size === products.length

  // Notify parent when all products reviewed
  useEffect(() => {
    onAllReviewed(() => isFullyReviewed)
  }, [isFullyReviewed, onAllReviewed])

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">
          Product {selectedIndex + 1} of {products.length}
        </h2>
        <div className="flex gap-2">
          {Array.from({ length: products.length }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                reviewedIndices.has(i)
                  ? 'bg-bwave-blue shadow-lg shadow-bwave-blue/50 flex-grow'
                  : 'bg-slate-700 w-8'
              }`}
              aria-label={`Product ${i + 1} ${reviewedIndices.has(i) ? 'reviewed' : 'not reviewed'}`}
            />
          ))}
        </div>
      </div>

      {/* Carousel container */}
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-gradient-to-br from-slate-900/50 to-slate-950/50" ref={emblaRef}>
        <div className="flex">
          {products.map((product, index) => (
            <div
              key={index}
              className="min-w-0 flex-[0_0_100%]"
              role="tabpanel"
              aria-label={`Product ${index + 1}: ${product.title || 'Untitled'}`}
            >
              <ProductReviewForm
                product={product}
                index={index}
                onUpdate={onUpdate}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:shadow-md hover:shadow-bwave-blue/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 disabled:hover:shadow-none disabled:hover:bg-slate-800 active:scale-95"
          aria-label="Previous product"
        >
          ← Prev
        </button>

        <div className="text-center text-sm text-slate-400">
          {isFullyReviewed ? (
            <span className="text-bwave-blue font-medium text-base animate-pulse">✓ All products reviewed</span>
          ) : (
            <span>{reviewedIndices.size} of {products.length} reviewed</span>
          )}
        </div>

        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:shadow-md hover:shadow-bwave-blue/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 disabled:hover:shadow-none disabled:hover:bg-slate-800 active:scale-95"
          aria-label="Next product"
        >
          Next →
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-slate-500 text-center">Tip: Use ← → arrow keys to navigate</p>
    </div>
  )
}

/**
 * Single product review form (reusable for each slide)
 */
function ProductReviewForm({
  product,
  index,
  onUpdate,
}: {
  product: Partial<ProductData>
  index: number
  onUpdate: (index: number, data: Partial<ProductData>) => void
}) {
  const [data, setData] = useState<Partial<ProductData>>(product)

  const handleChange = (field: keyof ProductData, value: any) => {
    const updated = { ...data, [field]: value }
    setData(updated)
    onUpdate(index, updated)
  }

  const handleArrayChange = (field: keyof ProductData, itemIndex: number, value: string) => {
    const arr = Array.isArray(data[field]) ? [...(data[field] as string[])] : []
    arr[itemIndex] = value
    handleChange(field, arr)
  }

  const addArrayItem = (field: keyof ProductData) => {
    const arr = Array.isArray(data[field]) ? [...(data[field] as string[])] : []
    arr.push('')
    handleChange(field, arr)
  }

  const removeArrayItem = (field: keyof ProductData, itemIndex: number) => {
    const arr = Array.isArray(data[field]) ? [...(data[field] as string[])] : []
    arr.splice(itemIndex, 1)
    handleChange(field, arr)
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-950/30 border border-slate-700 rounded-lg p-6 space-y-6 backdrop-blur-sm">
      {/* Title & Vendor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
          <input
            type="text"
            value={data.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Vendor</label>
          <input
            type="text"
            value={data.vendor || ''}
            onChange={(e) => handleChange('vendor', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
        />
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
          <input
            type="text"
            value={data.price || ''}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Compare At</label>
          <input
            type="text"
            value={data.compare_at_price || ''}
            onChange={(e) => handleChange('compare_at_price', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
          />
        </div>
      </div>

      {/* Sizes & Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">📏 Sizes</label>
          <div className="space-y-2">
            {Array.isArray(data.sizes) &&
              data.sizes.map((size, idx) => (
                <div key={idx} className="flex gap-2 group">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => handleArrayChange('sizes', idx, e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-800/50 border border-slate-600 rounded text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
                  />
                  <button
                    onClick={() => removeArrayItem('sizes', idx)}
                    className="px-2 py-1 bg-red-900/30 hover:bg-red-900/60 text-red-300 rounded text-sm transition-all duration-200 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}
            <button
              onClick={() => addArrayItem('sizes')}
              className="w-full text-sm text-bwave-blue hover:text-bwave-cyan px-2 py-1.5 rounded transition-all duration-200 hover:bg-bwave-blue/10"
            >
              + Add Size
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">🎨 Colors</label>
          <div className="space-y-2">
            {Array.isArray(data.colors) &&
              data.colors.map((color, idx) => (
                <div key={idx} className="flex gap-2 group">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleArrayChange('colors', idx, e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-800/50 border border-slate-600 rounded text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-bwave-blue hover:bg-slate-800"
                  />
                  <button
                    onClick={() => removeArrayItem('colors', idx)}
                    className="px-2 py-1 bg-red-900/30 hover:bg-red-900/60 text-red-300 rounded text-sm transition-all duration-200 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}
            <button
              onClick={() => addArrayItem('colors')}
              className="w-full text-sm text-bwave-blue hover:text-bwave-cyan px-2 py-1.5 rounded transition-all duration-200 hover:bg-bwave-blue/10"
            >
              + Add Color
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
