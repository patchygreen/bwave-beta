import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * Magic Link Authentication Callback Handler
 *
 * This route completes the OAuth2 authorization code flow for passwordless auth:
 * 1. User requests magic link via /login (triggers Supabase OTP email)
 * 2. User clicks link in email: /auth/callback?code=AUTH_CODE
 * 3. We exchange AUTH_CODE for a session token
 * 4. Session token is set as an HTTP-only cookie
 * 5. User redirected to dashboard with active session
 *
 * CRITICAL: Must set cookies in both response headers AND server cookie store.
 * Only setting in cookieStore won't reach the browser. Only in response won't
 * persist server-side. Both are required for the session to work across requests.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/app/dashboard'

  // Validate code exists
  if (!code) {
    console.warn('Auth callback called without code parameter')
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL(next, request.url))

  // Create Supabase client with cookie handlers that will:
  // 1. Read existing cookies from request
  // 2. Write new auth cookies to both cookieStore AND response headers
  const supabase = createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set in server cookie store
            cookieStore.set(name, value, options)
            // IMPORTANT: Also set in response headers so browser receives it
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Exchange auth code for session
    // This validates the code and sets sb-*-auth-token cookie
    await supabase.auth.exchangeCodeForSession(code)
  } catch (error) {
    console.error('Auth callback exchange failed:', error)
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  // Return response with cookies set in headers
  return response
}
