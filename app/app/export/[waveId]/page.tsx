'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { exportCSV } from '@/lib/server/export'
import { WaveLoader } from '@/components/WaveLoader'

type ExportState = 'loading' | 'success' | 'error'

export default function ExportPage() {
  const params = useParams()
  const router = useRouter()
  const waveId = params.waveId as string

  const [state, setState] = useState<ExportState>('loading')
  const [downloadUrl, setDownloadUrl] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const performExport = async () => {
      console.log('🚀 Starting CSV export for waveId:', waveId)
      setState('loading')

      const result = await exportCSV(waveId)

      if (result.success && result.url) {
        console.log('✅ Export successful, URL:', result.url)
        setDownloadUrl(result.url)
        setState('success')
      } else {
        console.error('❌ Export failed:', result.error)
        setErrorMessage(result.error || 'Failed to generate CSV')
        setState('error')
      }
    }

    performExport()
  }, [waveId])

  const handleRetry = () => {
    setState('loading')
    performExport()

    const performExport = async () => {
      const result = await exportCSV(waveId)
      if (result.success && result.url) {
        setDownloadUrl(result.url)
        setState('success')
      } else {
        setErrorMessage(result.error || 'Failed to generate CSV')
        setState('error')
      }
    }
  }

  if (state === 'loading') {
    return (
      <div className="max-w-2xl mx-auto">
        <WaveLoader />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Export Failed</h1>
          <p className="text-slate-400">Something went wrong while generating your CSV</p>
        </div>

        <div className="bg-gradient-to-br from-red-900/20 to-red-900/10 border border-red-700 rounded-lg p-8 mb-8">
          <div className="mb-6">
            <p className="text-red-300 mb-2">
              <span className="text-2xl">❌</span> {errorMessage}
            </p>
            <p className="text-sm text-slate-400 mt-4">Please try again, or contact support if the problem persists.</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleRetry}
              className="flex-1 bg-bwave-blue text-white px-4 py-3 rounded-lg font-medium hover:bg-bwave-cyan hover:shadow-lg hover:shadow-bwave-blue/50 transition-all"
            >
              ↻ Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-700 transition-all"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="max-w-2xl mx-auto">
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
              <p className="text-slate-400 text-sm mt-1">Click below to download your CSV file</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h3 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
            <span>⚙️</span> Shopify CSV Format
          </h3>
          <p className="text-slate-300 text-sm">
            The CSV includes all Shopify import columns: Handle, Title, Vendor, Type, Description, Tags, Price, and variant options.
          </p>
        </section>

        <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h3 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
            <span>📝</span> Need Help?
          </h3>
          <p className="text-slate-300 text-sm">
            Check Shopify's{' '}
            <a
              href="https://help.shopify.com/en/manual/products/import-export/using-csv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bwave-blue hover:text-bwave-cyan underline"
            >
              import guide
            </a>{' '}
            for detailed instructions on uploading products.
          </p>
        </section>
      </div>
    </div>
  )
}
