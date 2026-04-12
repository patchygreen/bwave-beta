export default function Home() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/logo.svg" alt="bwave" width="160" height="52" />
        </div>

        {/* Tagline */}
        <p className="text-lg text-slate-400 mb-8">
          Turn supplier PDFs into Shopify-ready CSVs
        </p>

        {/* CTA Button - using brand blue with glow effect */}
        <a
          href="/login"
          className="inline-block bg-bwave-blue text-white px-8 py-3 rounded-lg font-medium hover:bg-bwave-purple hover:shadow-lg hover:shadow-bwave-blue/50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-bwave-blue shadow-lg"
        >
          Get started
        </a>

        {/* Accent line with brand colors */}
        <div className="mt-8 flex justify-center gap-1">
          <div className="h-1 w-6 bg-bwave-blue rounded-full" />
          <div className="h-1 w-6 bg-bwave-cyan rounded-full" />
          <div className="h-1 w-6 bg-bwave-purple rounded-full" />
          <div className="h-1 w-6 bg-bwave-pink rounded-full" />
        </div>
      </div>
    </main>
  )
}
