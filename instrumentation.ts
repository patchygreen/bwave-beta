/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts (not on every request).
 * Used to initialize Sentry and other monitoring tools.
 */

export async function register() {
  // Only register on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config.ts')
  }
}
