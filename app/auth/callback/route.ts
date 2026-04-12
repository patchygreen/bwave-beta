import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * ROUTE: /auth/callback
 * METHOD: GET
 *
 * Magic Link Authentication Callback Handler
 * ============================================
 *
 * WHAT HAPPENS:
 * When user clicks the magic link in their email, they're sent to this URL with
 * a temporary authorization code. This route exchanges that code for a permanent
 * session token that keeps them logged in.
 *
 * FLOW:
 * 1. User enters email on /login
 * 2. Supabase sends magic link email with: /auth/callback?code=XXXXX
 * 3. User clicks link (this route runs)
 * 4. We exchange code for session token from Supabase
 * 5. Session token stored in HTTP-only cookie (secure, can't be accessed by JS)
 * 6. User redirected to dashboard, now logged in
 *
 * WHY COOKIES MATTER:
 * Cookies let the browser automatically send the session token with every request.
 * Without cookies, user would need to copy/paste token on every page visit.
 *
 * CRITICAL COOKIE HANDLING:
 * We MUST set cookies in TWO places:
 * - cookieStore: Persists it server-side so server can read it on next request
 * - response.cookies: Sends it to browser so browser sends it back in future requests
 *
 * If we only set in cookieStore, browser never receives it (session breaks).
 * If we only set in response, server can't read it on next request (middleware fails).
 * BOTH are required.
 *
 * ERROR CASES:
 * - No code in URL: Invalid link or link expired → redirect to login
 * - Code exchange fails: Supabase rejected the code → redirect to login with error
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: NextRequest) {
  console.log('🔐 Auth callback START')

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/app/dashboard'

  console.log('📍 Code present:', !!code)
  console.log('📍 Redirect to:', next)

  // VALIDATION: Check if authorization code exists
  // If not present, the link was invalid or expired
  if (!code) {
    console.warn('❌ Auth callback called without code parameter - invalid or expired link')
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  // Prepare server cookie storage
  const cookieStore = cookies()
  console.log('📍 Cookie store ready')

  // Prepare the response we'll send back to browser
  // Start with redirect to dashboard (or custom next URL)
  const response = NextResponse.redirect(new URL(next, request.url))

  // Create Supabase client configured with our cookie handlers
  // These functions tell Supabase WHERE to read/write cookies
  const supabase = createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // READ cookies from server cookie store
        getAll() {
          return cookieStore.getAll()
        },
        // WRITE cookies to BOTH locations
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 1. Store in server-side cookie store (so server can read it)
            cookieStore.set(name, value, options as any)
            // 2. Add to response headers (so browser receives it and stores it)
            // This is CRITICAL - without this, browser never gets the session
            response.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  try {
    console.log('🔄 Exchanging code for session...')

    // EXCHANGE: Trade temporary code for permanent session token
    // Supabase validates the code and returns a session object
    // Our cookie handlers automatically store the session token
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)

    console.log('📍 Exchange complete. Error:', exchangeError, 'Data:', !!data)

    if (exchangeError) {
      console.error('❌ Auth exchange error:', JSON.stringify(exchangeError))
      return NextResponse.redirect(new URL('/login?error=auth', request.url))
    }

    // If we get here, exchange was successful
    // Session cookie is now set in both response headers and server store
    console.log('✅ Auth successful: Code exchanged for session')
  } catch (error) {
    // CODE EXCHANGE FAILED
    // This can happen if:
    // - Code is invalid/expired
    // - Code was already used
    // - Supabase server is down
    console.error('❌ Auth callback caught exception:', error)
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  // RESPONSE: Send redirect with session cookie to browser
  // Browser now has the session cookie and will send it with next request
  console.log('🚀 Redirecting to:', next)
  return response
}
