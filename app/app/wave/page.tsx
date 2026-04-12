import UploadForm from '@/components/UploadForm'

export default function WavePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-900 mb-2">
          Create a product wave
        </h1>
        <p className="text-slate-600">
          Upload a supplier PDF or label image to extract product information
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <UploadForm />
      </div>

      <div className="mt-8 space-y-4 text-sm text-slate-600">
        <div>
          <h3 className="font-medium text-slate-900 mb-1">Supported formats</h3>
          <p>PDF documents, PNG, JPG, WebP images</p>
        </div>
        <div>
          <h3 className="font-medium text-slate-900 mb-1">What happens next</h3>
          <p>We'll extract product information using AI and show you a review screen where you can edit before exporting</p>
        </div>
      </div>
    </div>
  )
}
