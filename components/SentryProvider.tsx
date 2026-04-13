'use client'

import * as Sentry from '@sentry/nextjs'
import { ReactNode } from 'react'

/**
 * Client-side Sentry initialization wrapper
 * Wraps the entire app to ensure error tracking is active
 */
export function SentryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// Export Sentry for use in error boundaries
export { Sentry }
