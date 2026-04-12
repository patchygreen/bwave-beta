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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-bwave-blue/20 bg-slate-900/50 backdrop-blur-sm shadow-lg" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <a
            href="/app/dashboard"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
          >
            <img src="/logo.svg" alt="bwave" width="120" height="40" />
          </a>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-400" aria-label="Logged in as">
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
