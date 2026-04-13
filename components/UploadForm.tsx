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
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer focus-within:ring-2 focus-within:ring-bwave-blue focus-within:ring-offset-2 focus-within:ring-offset-black ${
          isDragging
            ? 'border-bwave-cyan bg-bwave-cyan/20 shadow-lg shadow-bwave-cyan/30'
            : 'border-bwave-blue/40 hover:border-bwave-blue/60 bg-gradient-to-br from-bwave-blue/10 to-bwave-cyan/10'
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
          <div className={`text-4xl mb-2 transition-transform ${isDragging ? 'scale-110' : ''}`} aria-hidden="true">
            {isDragging ? '⬇️' : '📄'}
          </div>
          <p className="text-white font-medium mb-1">
            {isDragging
              ? 'Drop your file here'
              : fileName
              ? `Selected: ${fileName}`
              : 'Click to upload or drag and drop'}
          </p>
          <p id="file-description" className="text-sm text-slate-400">
            PDF or image (PNG, JPG, WebP)
          </p>
          <p className="text-xs text-slate-500 mt-2">Max 10MB</p>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="p-3 bg-red-900/30 border border-red-600 rounded-lg text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Submit Button - using brand blue with glow effect */}
      <button
        type="submit"
        disabled={loading || !fileName}
        aria-busy={loading}
        className="w-full bg-bwave-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-bwave-cyan hover:shadow-lg hover:shadow-bwave-blue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        {loading ? 'Uploading...' : 'Continue'}
      </button>
    </form>
  )
}
