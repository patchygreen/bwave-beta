import UploadForm from '@/components/UploadForm'

export default function WavePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-white mb-2">
          Create a product wave
        </h1>
        <p className="text-slate-400">
          Upload a supplier PDF or label image to extract product information
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700 rounded-lg p-8 mb-8 hover:border-slate-600 transition-all">
        <UploadForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
            <span>📄</span> Supported formats
          </h2>
          <p className="text-slate-300 text-sm">
            PDF documents, PNG, JPG, WebP images — up to 10MB each
          </p>
        </section>

        <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
            <span>✨</span> What happens next
          </h2>
          <p className="text-slate-300 text-sm">
            We'll extract product data using AI and show you an editable review screen before exporting to CSV
          </p>
        </section>
      </div>
    </div>
  )
}
