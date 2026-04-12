import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from './lib/logger'

/**
 * MIDDLEWARE: Route Protection & Auth Enforcement
 * ===============================================
 *
 * WHAT IT DOES:
 * This code runs on EVERY HTTP request to protected routes (before page loads).
 * It checks if the user is logged in and either allows or blocks access.
 *
 * WHY IT MATTERS:
 * Without middleware, unauthenticated users could access /app/dashboard and see
 * nothing (pages would redirect to login inside component). With middleware,
 * we reject the request immediately before page code even loads. This is faster
 * and more secure.
 *
 * PROTECTED ROUTES:
 * - /app/* → Only logged-in users can access
 * - /login → Only logged-out users can access
 *
 * FLOW FOR UNAUTHENTICATED USER VISITING /app/dashboard:
 * 1. Browser requests /app/dashboard
 * 2. Middleware runs first (before page loads)
 * 3. We check: "Does this user have a valid session cookie?"
 * 4. No session found → Redirect to /login immediately
 * 5. Page never loads, user goes straight to login form
 *
 * FLOW FOR AUTHENTICATED USER VISITING /login:
 * 1. Browser requests /login
 * 2. Middleware runs
 * 3. We check: "Does this user have a valid session?"
 * 4. Yes, session found → Redirect to /app/dashboard immediately
 * 5. No need to show login form to someone already logged in
 *
 * SESSION VERIFICATION:
 * Supabase stores session in HTTP-only cookie (sb-*-auth-token).
 * We read this cookie and ask Supabase: "Is this session valid?"
 * If yes, user is authenticated. If no, session is expired/invalid.
 *
 * COOKIE REFRESH:
 * Each request refreshes the session expiration time.
 * So if user is actively browsing, they stay logged in.
 * If inactive for 24 hours, session expires and they must login again.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)

  // Prepare response object - we may modify it by adding/updating cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // CREATE SUPABASE CLIENT
  // This client reads cookies from the request and can write cookies to the response
  // We use it to check if the user's session is valid
  const supabase = createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // READ cookies from incoming request
        // (Supabase uses these to restore the user's session)
        getAll() {
          return request.cookies.getAll()
        },
        // WRITE cookies to response headers
        // (If session is refreshed, the new cookies go back to browser)
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CHECK SESSION: Ask Supabase if cookies contain a valid session
  // Returns { user: null } if no valid session
  // Returns { user: { id, email, ... } } if session is valid
  const {
    data: { user },
  } = await supabase.auth.getUser()

  logger.debug('middleware', 'Session check complete', {
    path: requestUrl.pathname,
    isAuthenticated: !!user,
    userId: user?.id,
  })

  // RULE 1: Block unauthenticated users from accessing /app/*
  // If no session AND requesting protected route → send to login
  if (!user && requestUrl.pathname.startsWith('/app')) {
    logger.warn('middleware', 'Unauthenticated access attempt to protected route', {
      path: requestUrl.pathname,
    })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // RULE 2: Redirect authenticated users away from login page
  // If session exists AND requesting /login → send to dashboard
  // No point showing login form to someone already logged in
  if (user && requestUrl.pathname === '/login') {
    logger.info('middleware', 'Authenticated user redirected from login to dashboard', {
      userId: user.id,
    })
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  // PASS: User is in correct place
  // Either:
  // - Unauthenticated user accessing public pages (/, /login, etc.)
  // - Authenticated user accessing protected routes (/app/*)
  return response
}

// Only run middleware on auth-related paths to save performance
export const config = {
  matcher: ['/app/:path*', '/login'],
}
