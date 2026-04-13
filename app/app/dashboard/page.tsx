import { createServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerClient()

  // User is authenticated via middleware protection on /app routes
  await supabase.auth.getUser()

  // Fetch recent waves with upload info
  const { data: recentWaves } = await supabase
    .from('product_waves')
    .select('id, created_at, extracted_data, upload_id, uploads(file_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch stats
  const [uploadsRes, exportsRes] = await Promise.all([
    supabase.from('uploads').select('id', { count: 'exact' }),
    supabase.from('csv_exports').select('id', { count: 'exact' }),
  ])

  const totalUploads = uploadsRes.count || 0
  const totalExports = exportsRes.count || 0
  const totalWaves = recentWaves?.length || 0

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">Welcome back</h1>
        <p className="text-slate-400">Manage your product extractions and exports</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Uploads */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-bwave-blue/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Total Uploads</h3>
            <span className="text-2xl">📤</span>
          </div>
          <p className="text-3xl font-light text-white">{totalUploads}</p>
        </div>

        {/* Products Extracted */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-bwave-cyan/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Extracted</h3>
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-3xl font-light text-white">{totalWaves}</p>
        </div>

        {/* CSV Exports */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-bwave-purple/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Exports</h3>
            <span className="text-2xl">📥</span>
          </div>
          <p className="text-3xl font-light text-white">{totalExports}</p>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Start Card */}
        <div className="lg:col-span-1">
          <Link href="/app/wave" className="block group">
            <div className="bg-gradient-to-br from-bwave-blue/20 via-bwave-cyan/10 to-transparent border border-bwave-blue/30 rounded-lg p-8 hover:border-bwave-blue/60 hover:bg-bwave-blue/10 transition-all group-hover:shadow-lg group-hover:shadow-bwave-blue/10">
              <div className="mb-6">
                <span className="text-5xl">🚀</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Create New Wave</h2>
              <p className="text-sm text-slate-300 mb-4">Convert supplier PDFs or images into Shopify CSV</p>
              <div className="inline-flex items-center text-bwave-cyan font-medium text-sm group-hover:gap-2 transition-all">
                Get started <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Waves */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Extractions</h2>
              <p className="text-sm text-slate-400 mt-1">Latest product waves</p>
            </div>

            {recentWaves && recentWaves.length > 0 ? (
              <div className="space-y-3">
                {recentWaves.map((wave) => (
                  <Link key={wave.id} href={`/app/review/${wave.id}`}>
                    <div className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-bwave-blue/40 transition-all group cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate group-hover:text-bwave-cyan transition-colors">
                          {wave.extracted_data?.title || 'Untitled Product'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          📄 {(wave.uploads as any)?.file_name || 'Unknown file'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(wave.created_at).toLocaleDateString()}{' '}
                          {new Date(wave.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-bwave-blue">→</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-slate-400 mb-4">No extractions yet</p>
                <Link href="/app/wave" className="text-bwave-cyan hover:text-bwave-blue text-sm font-medium">
                  Upload your first PDF →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
