'use client'

import { useState, useRef } from 'react'
import { uploadFile } from '@/lib/server/upload'
import { useRouter } from 'next/navigation'

export default function UploadForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!fileInputRef.current?.files?.[0]) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', fileInputRef.current.files[0])

    const result = await uploadFile(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Redirect to review/extraction page
      router.push(`/app/extract/${result.uploadId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Input */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
          id="file-input"
        />

        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-slate-900 font-medium mb-1">
            {fileName ? `Selected: ${fileName}` : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-slate-600">PDF or image (PNG, JPG, WebP)</p>
          <p className="text-xs text-slate-500 mt-2">Max 10MB</p>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !fileName}
        className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Uploading...' : 'Continue'}
      </button>
    </form>
  )
}
