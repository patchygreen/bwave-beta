'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-light tracking-tight text-white mb-3">Something went wrong</h1>
        <p className="text-slate-400 mb-8">An unexpected error occurred. Our team has been notified.</p>

        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 mb-6 text-left">
          <p className="text-sm text-slate-400 font-mono">{error.message}</p>
          {error.digest && <p className="text-xs text-slate-500 mt-2">Error ID: {error.digest}</p>}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-bwave-blue hover:bg-bwave-cyan text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/app/dashboard'}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
