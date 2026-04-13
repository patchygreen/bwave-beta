/**
 * Sentry Utilities for Error Tracking
 *
 * Helper functions for logging errors to Sentry in Server Actions
 */

import * as Sentry from '@sentry/nextjs'

interface ErrorContext {
  userId?: string
  uploadId?: string
  waveId?: string
  [key: string]: any
}

/**
 * Capture an error with context (for Server Actions)
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext,
  level: 'error' | 'warning' = 'error'
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error

  Sentry.captureException(errorObj, {
    level,
    contexts: {
      custom: context,
    },
  })
}

/**
 * Capture a message (for logging important events)
 */
export function captureMessage(
  message: string,
  context?: ErrorContext,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  })
}

/**
 * Wrap a Server Action with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        operation,
      })
      throw error
    }
  }) as T
}
