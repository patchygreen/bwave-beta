/**
 * Structured Logging System
 *
 * Production-ready logger for ecommerce app with:
 * - Structured JSON output (for log aggregation services like Datadog, Sentry)
 * - Request correlation IDs for tracing
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Performance metrics
 * - Sensitive data filtering
 *
 * Usage:
 *   logger.info('auth', 'User logged in', { userId: '123' })
 *   logger.error('upload', 'File upload failed', error, { fileSize: 5000 })
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogContext {
  timestamp: string
  level: LogLevel
  service: string
  message: string
  context?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
  duration?: number
  userId?: string
  correlationId?: string
}

/**
 * Sanitize sensitive data from context objects
 * Prevents logging passwords, tokens, PII, etc.
 */
const sanitize = (obj: any, depth = 0): any => {
  if (depth > 5) return '[CIRCULAR]'
  if (!obj || typeof obj !== 'object') return obj

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'sessionToken',
    'refreshToken',
    'creditCard',
    'ssn',
    'pin',
  ]

  const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitize(obj[key], depth + 1)
    } else {
      sanitized[key] = obj[key]
    }
  }

  return sanitized
}

/**
 * Format error for logging
 */
const formatError = (error: any) => {
  if (!error) return undefined

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    }
  }

  return {
    message: String(error),
  }
}

/**
 * Core logging function
 */
const log = (
  level: LogLevel,
  service: string,
  message: string,
  context?: Record<string, any>,
  error?: Error,
  duration?: number
): void => {
  const logEntry: LogContext = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
  }

  if (context) {
    logEntry.context = sanitize(context)
  }

  if (error) {
    logEntry.error = formatError(error)
  }

  if (duration !== undefined) {
    logEntry.duration = duration
  }

  // Add request correlation ID if available (in browser)
  if (typeof window !== 'undefined') {
    const correlationId = sessionStorage.getItem('correlation_id')
    if (correlationId) {
      logEntry.correlationId = correlationId
    }
  }

  // Output as JSON for log aggregation services
  const output = JSON.stringify(logEntry)

  // Use appropriate console method
  switch (level) {
    case 'DEBUG':
      console.debug(output)
      break
    case 'INFO':
      console.info(output)
      break
    case 'WARN':
      console.warn(output)
      break
    case 'ERROR':
      console.error(output)
      break
  }
}

/**
 * Public logger API
 */
export const logger = {
  /**
   * Debug level - detailed diagnostics
   */
  debug: (service: string, message: string, context?: Record<string, any>) => {
    log('DEBUG', service, `🔍 ${message}`, context)
  },

  /**
   * Info level - general information
   */
  info: (service: string, message: string, context?: Record<string, any>) => {
    log('INFO', service, `ℹ️ ${message}`, context)
  },

  /**
   * Warn level - warning but not critical
   */
  warn: (service: string, message: string, context?: Record<string, any>) => {
    log('WARN', service, `⚠️ ${message}`, context)
  },

  /**
   * Error level - something went wrong
   */
  error: (
    service: string,
    message: string,
    error?: Error,
    context?: Record<string, any>
  ) => {
    log('ERROR', service, `❌ ${message}`, context, error)
  },

  /**
   * Track operation timing
   * Usage: const timer = logger.timer('auth', 'exchangeCodeForSession')
   *        // ... do work ...
   *        timer.end({ success: true })
   */
  timer: (service: string, operation: string) => {
    const startTime = Date.now()
    return {
      end: (context?: Record<string, any>) => {
        const duration = Date.now() - startTime
        logger.info(service, `${operation} completed`, {
          ...context,
          duration: `${duration}ms`,
        })
      },
      error: (error: Error, context?: Record<string, any>) => {
        const duration = Date.now() - startTime
        logger.error(service, `${operation} failed`, error, {
          ...context,
          duration: `${duration}ms`,
        })
      },
    }
  },

  /**
   * Set user context for all subsequent logs in this session
   */
  setUserId: (userId: string) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('user_id', userId)
    }
  },

  /**
   * Generate or get correlation ID for request tracing
   */
  getCorrelationId: (): string => {
    if (typeof sessionStorage === 'undefined') return ''

    let correlationId = sessionStorage.getItem('correlation_id')
    if (!correlationId) {
      correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('correlation_id', correlationId)
    }
    return correlationId
  },
}
