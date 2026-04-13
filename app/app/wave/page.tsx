import UploadForm from '@/components/UploadForm'

export default function WavePage() {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .animation-delay-1 { animation-delay: 0.1s; }
        .animation-delay-2 { animation-delay: 0.2s; }
        .animation-delay-3 { animation-delay: 0.3s; }
      `}</style>

      <div className="w-full">
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">
            Create a product wave
          </h1>
          <p className="text-slate-400">
            Upload a supplier PDF or label image to extract product information
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700 rounded-lg p-8 mb-8 hover:border-slate-600 transition-all animate-fade-in-up animation-delay-1">
          <UploadForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-slate-500 hover:bg-slate-900/60 transition-all animate-fade-in-up animation-delay-2 cursor-default">
            <h2 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
              <span aria-hidden="true">📄</span> Supported formats
            </h2>
            <p className="text-slate-300 text-sm">
              PDF documents, PNG, JPG, WebP images — up to 10MB each
            </p>
          </section>

          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 hover:border-slate-500 hover:bg-slate-900/60 transition-all animate-fade-in-up animation-delay-3 cursor-default">
            <h2 className="flex items-center gap-2 font-semibold text-white mb-3 text-base">
              <span aria-hidden="true">✨</span> What happens next
            </h2>
            <p className="text-slate-300 text-sm">
              We'll extract product data using AI and show you an editable review screen before exporting to CSV
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
