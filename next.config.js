const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withSentryConfig(nextConfig, {
  org: 'bwave',
  project: 'bwave-beta',
  silent: true, // Suppress Sentry CLI logs in build
})
