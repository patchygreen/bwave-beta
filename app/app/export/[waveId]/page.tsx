'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { exportCSV } from '@/lib/server/export'
import { getWaveData } from '@/lib/server/review'
import WaveLoader from '@/components/WaveLoader'
import type { ProductData } from '@/lib/types'

type PageState = 'loading' | 'selecting' | 'exporting' | 'success' | 'error'

export default function ExportPage() {
  const params = useParams()
  const router = useRouter()
  const waveId = params.waveId as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [products, setProducts] = useState<ProductData[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Fetch wave data on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getWaveData(waveId)
        if (!data.success || !data.products) {
          setErrorMessage(data.error || 'Failed to load products')
          setPageState('error')
          return
        }

        const productArray = Array.isArray(data.products) ? data.products : [data.products]
        setProducts(productArray)

        // Auto-select all products initially
        setSelectedIndices(new Set(productArray.map((_, i) => i)))
        setPageState('selecting')
      } catch (err) {
        setErrorMessage('Failed to load products')
        setPageState('error')
      }
    }

    fetchProducts()
  }, [waveId])

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  const selectAll = () => {
    setSelectedIndices(new Set(products.map((_, i) => i)))
  }

  const deselectAll = () => {
    setSelectedIndices(new Set())
  }

  const performExport = async () => {
    if (selectedIndices.size === 0) {
      setErrorMessage('Please select at least one product to export')
      return
    }

    console.log('🚀 Starting CSV export for waveId:', waveId, 'with indices:', Array.from(selectedIndices))
    setPageState('exporting')

    const result = await exportCSV(waveId, Array.from(selectedIndices))

    if (result.success && result.url) {
      console.log('✅ Export successful, URL:', result.url)
      setDownloadUrl(result.url)
      setPageState('success')
    } else {
      console.error('❌ Export failed:', result.error)
      setErrorMessage(result.error || 'Failed to generate CSV')
      setPageState('error')
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <WaveLoader />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Oops!</h1>
          <p className="text-slate-400">Something went wrong</p>
        </div>

        <div className="bg-gradient-to-br from-red-900/20 to-red-900/10 border border-red-700 rounded-lg p-8 mb-8">
          <p className="text-red-300 mb-6">
            <span className="text-2xl">❌</span> {errorMessage}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 bg-bwave-blue text-white px-4 py-3 rounded-lg font-medium hover:bg-bwave-cyan hover:shadow-lg hover:shadow-bwave-blue/50 transition-all"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pageState === 'selecting') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Select Products to Export</h1>
          <p className="text-slate-400">Choose which products to include in your Shopify CSV</p>
        </div>

        <div className="max-w-2xl mb-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={selectAll}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-all"
            >
              ✓ Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-all"
            >
              ✗ Deselect All
            </button>
            <span className="ml-auto text-sm text-slate-400 py-2">
              {selectedIndices.size} of {products.length} selected
            </span>
          </div>

          <div className="space-y-3">
            {products.map((product, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all cursor-pointer"
                onClick={() => toggleProduct(index)}
              >
                <input
                  type="checkbox"
                  checked={selectedIndices.has(index)}
                  onChange={() => toggleProduct(index)}
                  className="mt-1 w-4 h-4 rounded cursor-pointer"
                  aria-label={`Select product ${index + 1}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {product.title || `Product ${index + 1}`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-400">
                    {product.vendor && <span>{product.vendor}</span>}
                    {product.price && <span>•</span>}
                    {product.price && <span className="text-bwave-blue font-medium">${product.price}</span>}
                  </div>
                  {(product.sizes?.length || 0) > 0 || (product.colors?.length || 0) > 0 ? (
                    <p className="text-xs text-slate-500 mt-1">
                      Variants: {(product.sizes?.length || 0)} sizes × {(product.colors?.length || 0)} colors
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={performExport}
            disabled={selectedIndices.size === 0}
            className="flex-1 bg-bwave-blue text-white px-6 py-4 rounded-lg font-medium hover:bg-bwave-cyan hover:shadow-lg hover:shadow-bwave-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Generate CSV
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 bg-slate-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-all"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  if (pageState === 'exporting') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <WaveLoader />
      </div>
    )
  }

  // Success state
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">Ready for Shopify 🎉</h1>
        <p className="text-slate-400">Your product data is ready to import</p>
      </div>

      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700 rounded-lg p-8 mb-8 hover:border-slate-600 transition-all">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">📊</span>
            <div>
              <h2 className="text-2xl font-semibold text-white">CSV Export Generated</h2>
              <p className="text-slate-400 text-sm mt-1">{selectedIndices.size} product(s) included</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700">
            <p className="text-sm text-slate-300 mb-3">
              <strong>What's included:</strong>
            </p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>✓ Product details (title, vendor, price, description)</li>
              <li>✓ All variants (one row per size × color combination)</li>
              <li>✓ Shopify-compatible format (ready to bulk import)</li>
              <li>✓ Tags and categories for better organization</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-300">
              💡 <strong>Next step:</strong> Download this CSV, then use Shopify's{' '}
              <a
                href="https://help.shopify.com/en/manual/products/import-export/using-csv"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                bulk import tool
              </a>{' '}
              to add these products to your store.
            </p>
          </div>

          <a
            href={downloadUrl}
            download
            className="block w-full bg-bwave-blue text-white px-6 py-4 rounded-lg font-medium hover:bg-bwave-cyan hover:shadow-lg hover:shadow-bwave-blue/50 transition-all text-center mb-4"
          >
            📥 Download CSV
          </a>

          <button
            onClick={() => router.push('/app/dashboard')}
            className="w-full bg-slate-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
