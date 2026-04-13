'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { extractProducts } from '@/lib/server/extract'
import { logger } from '@/lib/logger'
import WaveLoader from '@/components/WaveLoader'

export default function ExtractPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const router = useRouter()
  const { uploadId } = use(params)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return // Prevent double extraction (StrictMode)
    hasStartedRef.current = true

    const runExtraction = async () => {
      try {
        logger.info('🚀 extraction', 'Extract page mounted, starting extraction', { uploadId })

        const result = await extractProducts(uploadId)

        if (result.success && result.waveId) {
          logger.info('✅ extraction', 'Extraction successful, redirecting to review', {
            uploadId,
            waveId: result.waveId,
          })
          // Auto-redirect to review page
          router.push(`/app/review/${result.waveId}`)
        } else {
          const errorMsg = result.error || 'Failed to extract data'
          logger.error('❌ extraction', 'Extraction failed', new Error(errorMsg), { uploadId })
          setError(errorMsg)
          setIsProcessing(false)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
        logger.error('❌ extraction', 'Extraction error', err instanceof Error ? err : new Error(String(err)), {
          uploadId,
        })
        setError(errorMsg)
        setIsProcessing(false)
      }
    }

    runExtraction()
  }, [uploadId, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-light tracking-tight text-white mb-3">Extracting product data</h1>
          <p className="text-slate-500 text-sm">Upload ID: {uploadId}</p>
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <WaveLoader />
            </div>
            <p className="text-sm text-slate-500 text-center mt-2">This usually takes 10-30 seconds</p>
          </div>
        ) : (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-8 text-center">
            <p className="text-red-300 font-medium mb-6">❌ {error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setIsProcessing(true)
                  setError(null)
                  router.refresh()
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/app/wave')}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Back to Upload
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
