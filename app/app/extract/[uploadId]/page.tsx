import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function ExtractPage({
  params,
}: {
  params: { uploadId: string }
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch upload
  const { data: upload, error } = await supabase
    .from('uploads')
    .select('*')
    .eq('id', params.uploadId)
    .eq('profile_id', user.id)
    .single()

  if (error || !upload) {
    redirect('/app/wave')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-slate-900 mb-2">
          Extracting product data
        </h1>
        <p className="text-slate-600">
          {upload.file_name}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <div className="inline-block">
          <div className="animate-spin text-4xl mb-4" aria-hidden="true">⏳</div>
          <p className="text-slate-600 mb-2" role="status" aria-live="polite">
            Processing your file...
          </p>
          <p className="text-sm text-slate-500">
            We're analyzing the content using AI
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500 text-center">
        Upload ID: <span className="font-mono">{params.uploadId}</span>
      </p>
    </div>
  )
}
