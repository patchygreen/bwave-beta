export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-light tracking-tight mb-3 text-slate-900">
          bwave
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Turn supplier PDFs into Shopify-ready CSVs
        </p>
        <a
          href="/login"
          className="inline-block bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
        >
          Get started
        </a>
      </div>
    </main>
  )
}
