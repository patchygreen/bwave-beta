'use client'

import { useEffect, useState } from 'react'
import type { ProductData } from '@/lib/types'

interface ProductCarouselProps {
  products: ProductData[]
  onUpdate: (index: number, data: Partial<ProductData>) => void
  onAllReviewed: (callback: () => boolean) => void
}

export function ProductCarousel({ products, onUpdate, onAllReviewed }: ProductCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [reviewedIndices, setReviewedIndices] = useState<Set<number>>(new Set())

  // Mark as reviewed when viewing
  useEffect(() => {
    setReviewedIndices((prev) => new Set(prev).add(selectedIndex))
  }, [selectedIndex])

  // Notify parent when all reviewed AND on last slide
  useEffect(() => {
    const isFullyReviewed = reviewedIndices.size === products.length && selectedIndex === products.length - 1
    onAllReviewed(() => isFullyReviewed)
  }, [reviewedIndices, selectedIndex, products.length, onAllReviewed])

  const scrollPrev = () => {
    if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1)
  }

  const scrollNext = () => {
    if (selectedIndex < products.length - 1) setSelectedIndex(selectedIndex + 1)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        scrollPrev()
      } else if (e.key === 'ArrowRight') {
        scrollNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, products.length])

  const canScrollPrev = selectedIndex > 0
  const canScrollNext = selectedIndex < products.length - 1
  const isFullyReviewed = reviewedIndices.size === products.length && selectedIndex === products.length - 1

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:shadow-md hover:shadow-bwave-blue/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 disabled:hover:shadow-none disabled:hover:bg-slate-800 active:scale-95"
          aria-label="Previous product"
        >
          ← Prev
        </button>

        <h2 className="text-lg font-medium text-white">
          Product {selectedIndex + 1} of {products.length}
        </h2>

        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:shadow-md hover:shadow-bwave-blue/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 disabled:hover:shadow-none disabled:hover:bg-slate-800 active:scale-95"
          aria-label="Next product"
        >
          Next →
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Progress</span>
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

      {/* Carousel slides - only show current one */}
      <div className="relative">
        {products.map((product, index) => (
          <div
            key={index}
            style={{ display: index === selectedIndex ? 'block' : 'none' }}
            role="tabpanel"
            aria-label={`Product ${index + 1}: ${product.title || 'Untitled'}`}
          >
            {/* Glow effect on visible slide */}
            <div className="absolute inset-0 -z-10 bg-bwave-blue/10 blur-2xl rounded-lg pointer-events-none" />
            <ProductReviewForm
              product={product}
              index={index}
              onUpdate={onUpdate}
            />
          </div>
        ))}
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
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-slate-300">📏 Sizes & Stock</label>
            <div className="text-xs text-bwave-blue font-semibold">
              Total: {Object.values(data.quantities || {}).reduce((a, b) => a + (b || 0), 0)}
            </div>
          </div>
          {Array.isArray(data.sizes) && data.sizes.length > 0 ? (
            <div className="space-y-3">
              {data.sizes.map((size, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-800/40 to-slate-800/20 border border-slate-700 hover:border-slate-600 rounded-lg transition-all group"
                >
                  {/* Size badge */}
                  <div className="flex-shrink-0">
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => handleArrayChange('sizes', idx, e.target.value)}
                      className="w-16 text-center bg-slate-900/60 border border-slate-600 text-slate-300 text-sm font-semibold px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Stock input */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Stock:</span>
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="number"
                        min="0"
                        value={data.quantities?.[size] ?? ''}
                        onChange={(e) => {
                          const newQuantities = { ...data.quantities, [size]: parseInt(e.target.value) || 0 }
                          handleChange('quantities', newQuantities)
                        }}
                        className="w-full bg-slate-900/60 border border-slate-600 text-bwave-blue text-sm text-center font-bold px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-transparent transition-all placeholder:text-slate-600"
                        placeholder="0"
                      />
                      {(data.quantities?.[size] || 0) > 0 && (
                        <div className="absolute inset-0 rounded-md bg-bwave-blue/5 pointer-events-none blur-sm" />
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeArrayItem('sizes', idx)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all active:scale-95 text-sm font-bold p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={() => addArrayItem('sizes')}
                className="w-full text-sm text-bwave-blue hover:text-bwave-cyan font-medium px-4 py-3 rounded-lg transition-all duration-200 hover:bg-bwave-blue/10 border border-dashed border-slate-600 hover:border-bwave-blue/50 active:scale-95"
              >
                + Add Size
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-700 rounded-lg">No sizes added</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">🎨 Colors</label>
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
