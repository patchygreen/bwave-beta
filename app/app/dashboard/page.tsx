import { createServerClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-900 mb-2">
          Welcome back
        </h1>
        <p className="text-slate-600">Ready to create your first product wave?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Wave Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-sm transition-shadow">
          <div className="mb-4">
            <h2 className="text-xl font-medium text-slate-900">Product Wave</h2>
            <p className="text-sm text-slate-600 mt-1">
              Convert supplier PDFs or images into Shopify CSV
            </p>
          </div>
          <a
            href="/app/wave"
            className="inline-block text-slate-900 hover:text-slate-700 font-medium text-sm"
          >
            Get started →
          </a>
        </div>

        {/* Recent Waves (placeholder) */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-medium text-slate-900 mb-4">Recent waves</h2>
          <p className="text-slate-600 text-sm">No waves yet. Create your first one!</p>
        </div>
      </div>
    </div>
  )
}
