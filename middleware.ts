import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Authentication and Route Protection Middleware
 *
 * Runs on every request to /app/* and /login routes to:
 * 1. Verify user session from cookies
 * 2. Enforce access control (authenticated users only for /app/*)
 * 3. Prevent authenticated users from accessing /login
 * 4. Refresh session state (extends expiration on each request)
 *
 * This centralizes auth enforcement and prevents accidental exposure of
 * protected routes. Middleware runs BEFORE route handlers, so invalid
 * sessions are blocked before any page logic executes.
 *
 * Config at bottom limits middleware to specific routes for performance.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client in middleware context
  // Reads cookies from request, can write new ones to response
  const supabase = createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check if user session exists from cookies
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users trying to access protected app routes
  if (!user && requestUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from login page to dashboard
  if (user && requestUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  return response
}

// Only run middleware on auth-related paths to save performance
export const config = {
  matcher: ['/app/:path*', '/login'],
}
