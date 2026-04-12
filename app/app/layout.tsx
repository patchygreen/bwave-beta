import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/SignOutButton'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a
            href="/app/dashboard"
            className="text-2xl font-light text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 rounded px-2 py-1"
          >
            bwave
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600" aria-label="Logged in as">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
