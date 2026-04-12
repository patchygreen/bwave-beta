import { createServerClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch recent waves
  const { data: recentWaves } = await supabase
    .from('product_waves')
    .select('id, created_at, extracted_data')
    .order('created_at', { ascending: false })
    .limit(5)

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

        {/* Recent Waves */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-medium text-slate-900 mb-4">Recent waves</h2>
          {recentWaves && recentWaves.length > 0 ? (
            <div className="space-y-2">
              {recentWaves.map((wave) => (
                <a
                  key={wave.id}
                  href={`/app/review/${wave.id}`}
                  className="block p-2 rounded hover:bg-slate-50 text-sm"
                >
                  <p className="text-slate-900 font-medium">
                    {wave.extracted_data?.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(wave.created_at).toLocaleDateString()}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-sm">No waves yet. Create your first one!</p>
          )}
        </div>
      </div>
    </div>
  )
}
