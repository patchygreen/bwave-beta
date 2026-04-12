'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

// Beta whitelist: Only these emails can access the MVP
const ALLOWED_EMAILS = [
  'patrick.crean@zalando.ie',
  'patrick@b-wave.io',
  'catherine@b-wave.io',
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Check if email is on the beta whitelist
    const normalizedEmail = email.toLowerCase().trim()
    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      setError('Email not authorized for beta access. Contact the team to request access.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for the magic link!')
        setEmail('')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-8 flex justify-center">
          <img src="/logo.svg" alt="bwave" width="120" height="40" />
        </div>

        <p className="text-center text-slate-400 mb-6">Sign in to your account</p>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              aria-required="true"
              aria-describedby={error ? 'email-error' : undefined}
              className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Magic link button - using brand blue with glow */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-bwave-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-bwave-purple hover:shadow-lg hover:shadow-bwave-blue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded-lg text-sm text-green-300"
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            id="email-error"
            role="alert"
            aria-live="assertive"
            className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded-lg text-sm text-red-300"
          >
            ✕ {error}
          </div>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          <a
            href="/"
            className="text-bwave-blue hover:text-bwave-cyan focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1 transition-colors"
          >
            Back to home
          </a>
        </p>
      </div>
    </main>
  )
}
