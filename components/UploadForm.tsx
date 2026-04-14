'use client'

import { useState, useRef } from 'react'
import { uploadFile } from '@/lib/server/upload'
import { useRouter } from 'next/navigation'

export default function UploadForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setError(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files
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

    console.log('Upload result:', result)

    if (result.error) {
      console.error('Upload error:', result.error)
      setError(result.error)
      setLoading(false)
    } else {
      console.log('Upload successful, redirecting to:', `/app/extract/${result.uploadId}`)
      // Redirect to review/extraction page
      router.push(`/app/extract/${result.uploadId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Input */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer group ${
          isDragging
            ? 'border-bwave-cyan bg-bwave-cyan/20 shadow-lg shadow-bwave-cyan/40 scale-105'
            : 'border-slate-600 hover:border-bwave-blue/80 hover:bg-bwave-blue/5 bg-slate-800/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
          id="file-input"
          aria-label="Upload product file"
          aria-describedby="file-description"
        />

        <label htmlFor="file-input" className="cursor-pointer block">
          <div className={`text-5xl mb-4 transition-all duration-300 ${isDragging ? 'scale-125 -translate-y-1' : 'group-hover:scale-110'}`} aria-hidden="true">
            {isDragging ? '⬇️' : '📦'}
          </div>

          <p className="text-lg font-semibold text-white mb-2">
            {isDragging
              ? 'Drop your file here'
              : fileName
              ? `✓ ${fileName}`
              : 'Upload your supplier file'}
          </p>

          <p id="file-description" className="text-sm text-slate-400 mb-3">
            Drag and drop, or <span className="text-bwave-blue font-medium hover:text-bwave-cyan">choose a file</span>
          </p>

          <div className="flex gap-4 justify-center text-xs text-slate-500 pt-3 border-t border-slate-700/50">
            <span>PDF, PNG, JPG, WebP</span>
            <span>•</span>
            <span>Up to 10MB</span>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-900/30 border border-red-600 rounded-lg text-sm text-red-300 flex items-start gap-3"
        >
          <span className="text-lg flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* File Selected State */}
      {fileName && !error && (
        <div className="p-4 bg-bwave-blue/10 border border-bwave-blue/50 rounded-lg text-sm text-bwave-blue flex items-start gap-3">
          <span className="text-lg flex-shrink-0">✓</span>
          <span><strong>Ready to go!</strong> Click continue to extract product data</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !fileName}
        aria-busy={loading}
        className="w-full bg-bwave-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-bwave-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:shadow-bwave-blue/40 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block animate-spin">⏳</span>
            Uploading...
          </span>
        ) : fileName ? (
          'Continue → Extract Data'
        ) : (
          'Select a file to continue'
        )}
      </button>
    </form>
  )
}
