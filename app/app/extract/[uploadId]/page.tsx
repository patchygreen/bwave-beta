'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { extractProducts } from '@/lib/server/extract'
import { logger } from '@/lib/logger'
import WaveLoader from '@/components/WaveLoader'

export default function ExtractPage({ params }: { params: Promise<{ uploadId: string }> }) {
  const router = useRouter()
  const { uploadId } = use(params)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Extracting product data</h1>
        <p className="text-slate-400">Upload ID: {uploadId}</p>
      </div>

      {isProcessing ? (
        <div className="bg-gradient-to-b from-slate-900/50 to-slate-900/30 border border-slate-700 rounded-lg p-12 text-center">
          <WaveLoader />
          <p className="text-sm text-slate-500 mt-4">This usually takes 10-30 seconds</p>
        </div>
      ) : (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
          <p className="text-red-300 font-medium mb-4">❌ {error}</p>
          <button
            onClick={() => {
              setIsProcessing(true)
              setError(null)
              router.refresh()
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/app/wave')}
            className="ml-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Upload
          </button>
        </div>
      )}
    </div>
  )
}
