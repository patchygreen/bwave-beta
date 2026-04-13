#!/usr/bin/env node

/**
 * Pre-build Environment Validation Script
 *
 * Runs before Next.js build to ensure all required environment variables are set.
 * This prevents builds that would fail silently in production.
 *
 * Usage: node scripts/validate-env.js
 */

// Load .env.local manually since this runs outside Next.js
const path = require('path')
const fs = require('fs')

const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8')
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  }
}

const REQUIRED_ENV_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key for admin access',
  ANTHROPIC_API_KEY: 'Anthropic API key for Claude Vision',
}

const OPTIONAL_ENV_VARS = {
  SENTRY_DSN: 'Sentry error tracking (optional)',
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'Sentry environment tag',
}

function validateEnv() {
  console.log('🔍 Validating environment variables...\n')

  const missing = []
  const warnings = []

  // Check required vars
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key]
    if (!value || !value.trim()) {
      missing.push(`  ❌ ${key}`)
      console.log(`     ${description}`)
    } else {
      console.log(`  ✅ ${key}`)
    }
  }

  console.log()

  // Check optional vars
  for (const [key, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[key]
    if (!value || !value.trim()) {
      warnings.push(`  ⚠️  ${key}`)
      console.log(`  ⚠️  ${key} (optional)`)
      console.log(`     ${description}`)
    } else {
      console.log(`  ✅ ${key} (optional)`)
    }
  }

  console.log()

  if (missing.length > 0) {
    console.error('❌ VALIDATION FAILED: Missing required environment variables:\n')
    missing.forEach((m) => console.error(m))
    console.error(
      '\n📖 See .env.local.example for required variables\n' +
        '   cp .env.local.example .env.local\n' +
        '   then fill in your actual values\n'
    )
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn('⚠️  WARNINGS: Some optional features are disabled:\n')
    warnings.forEach((w) => console.warn(w))
    console.warn('\n💡 These are optional for development but recommended for production\n')
  }

  console.log('✅ Environment validation passed!\n')
}

// Run validation
if (require.main === module) {
  validateEnv()
}

module.exports = { validateEnv }
