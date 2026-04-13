/**
 * Environment Variable Validation
 *
 * Ensures all required environment variables are set at build time and runtime.
 * This prevents "undefined API key in production" errors.
 */

interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

const REQUIRED_ENV_VARS = {
  // Public (safe to expose)
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',

  // Private (server-side only)
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key for admin access',
  ANTHROPIC_API_KEY: 'Anthropic API key for Claude Vision',
}

const OPTIONAL_ENV_VARS = {
  SENTRY_DSN: 'Sentry error tracking (optional)',
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'Sentry environment tag (dev/staging/prod)',
}

/**
 * Validate environment at build time
 */
export function validateEnvBuild(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required vars
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`${key} - ${description}`)
    }
  }

  // Check optional vars and warn if missing
  for (const [key, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[key]) {
      warnings.push(`${key} - ${description}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Validate environment at runtime (server-side)
 */
export function validateEnvRuntime(): EnvValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  // Runtime needs service role key for extractions
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`${key} - ${description}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  }
}

/**
 * Check a specific environment variable exists and is not empty
 */
export function hasEnv(key: string): boolean {
  return Boolean(process.env[key] && process.env[key]!.trim())
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value && value.trim()) return value
  if (fallback !== undefined) return fallback
  throw new Error(`Missing environment variable: ${key}`)
}
