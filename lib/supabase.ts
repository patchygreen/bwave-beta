'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Custom Cookie Storage for PKCE
 *
 * Stores auth state (including PKCE code verifier) in cookies instead of
 * localStorage. This is CRITICAL for SSR magic link auth to work:
 *
 * 1. User requests magic link on /login (browser generates PKCE code)
 * 2. PKCE code stored in cookie (not localStorage)
 * 3. User clicks link → /auth/callback
 * 4. Server reads PKCE code from cookie and exchanges code for session
 *
 * Without this, the server can't find the PKCE code because it's in
 * localStorage on the browser, which the server can't access.
 */
const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === 'undefined') return null
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(key + '='))
      ?.split('=')[1]
    return cookieValue ? decodeURIComponent(cookieValue) : null
  },
  setItem: (key: string, value: string) => {
    if (typeof document === 'undefined') return
    // Don't use secure flag on localhost (HTTP) - it will reject the cookie
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const secureFlag = isLocalhost ? '' : '; secure'
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secureFlag}`
  },
  removeItem: (key: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
  },
}

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: cookieStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  )
