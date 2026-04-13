'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { ProductData, ProductWave } from '@/lib/types'

export default function ReviewPage({ params }: { params: Promise<{ waveId: string }> }) {
  const router = useRouter()
  const { waveId } = use(params)
  const [wave, setWave] = useState<ProductWave | null>(null)
  const [data, setData] = useState<Partial<ProductData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchWave = async () => {
      try {
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        logger.info('📦 review', 'Fetching wave data', { waveId })

        const { data: waveData, error: waveError } = await supabase
          .from('product_waves')
          .select('*')
          .eq('id', waveId)
          .eq('profile_id', user.id)
          .single()

        if (waveError || !waveData) {
          logger.error('📦 review', 'Failed to fetch wave', new Error(waveError?.message || 'Wave not found'))
          setError('Wave not found')
          return
        }

        setWave(waveData)
        setData(waveData.extracted_data)
        logger.info('📦 review', 'Wave loaded successfully', { waveId })
      } catch (err) {
        logger.error('📦 review', 'Error fetching wave', err instanceof Error ? err : new Error(String(err)))
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchWave()
  }, [waveId, router])

  const handleFieldChange = (field: keyof ProductData, value: any) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const handleArrayChange = (field: keyof ProductData, index: number, value: string) => {
    setData((prev) => {
      if (!prev) return null
      const arr = Array.isArray(prev[field]) ? [...(prev[field] as string[])] : []
      arr[index] = value
      return { ...prev, [field]: arr }
    })
  }

  const addArrayItem = (field: keyof ProductData) => {
    setData((prev) => {
      if (!prev) return null
      const arr = Array.isArray(prev[field]) ? [...(prev[field] as string[])] : []
      arr.push('')
      return { ...prev, [field]: arr }
    })
  }

  const removeArrayItem = (field: keyof ProductData, index: number) => {
    setData((prev) => {
      if (!prev) return null
      const arr = Array.isArray(prev[field]) ? [...(prev[field] as string[])] : []
      arr.splice(index, 1)
      return { ...prev, [field]: arr }
    })
  }

  const handleConfirm = async () => {
    if (!wave || !data) return

    setSaving(true)
    try {
      logger.info('💾 review', 'Saving extracted data', { waveId: waveId })

      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('product_waves')
        .update({ extracted_data: data })
        .eq('id', waveId)

      if (updateError) {
        logger.error('💾 review', 'Failed to save', new Error(updateError.message))
        setError('Failed to save changes')
        return
      }

      logger.info('✅ review', 'Data saved successfully, redirecting to export', { waveId: waveId })
      // TODO: Redirect to export page once built
      router.push(`/app/export/${waveId}`)
    } catch (err) {
      logger.error('💾 review', 'Error saving', err instanceof Error ? err : new Error(String(err)))
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-300">Loading product data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6 mb-4">
          <p className="text-red-300 mb-4">❌ {error || 'No data available'}</p>
          <button
            onClick={() => router.push('/app/dashboard')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Review & Edit</h1>
        <p className="text-slate-400">Make any corrections before exporting to Shopify CSV</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">📋 Product Information</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Vendor</label>
              <input
                type="text"
                value={data.vendor || ''}
                onChange={(e) => handleFieldChange('vendor', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Product Type</label>
              <input
                type="text"
                value={data.product_type || ''}
                onChange={(e) => handleFieldChange('product_type', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Materials</label>
              <input
                type="text"
                value={data.materials || ''}
                onChange={(e) => handleFieldChange('materials', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
          <textarea
            value={data.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
          />
        </div>

        {/* Pricing */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">💰 Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
              <input
                type="text"
                value={data.price || ''}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Compare At Price</label>
              <input
                type="text"
                value={data.compare_at_price || ''}
                onChange={(e) => handleFieldChange('compare_at_price', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
              />
            </div>
          </div>
        </div>

        {/* Sizes & Colors */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">📏 Sizes</h2>
            <div className="space-y-2">
              {Array.isArray(data.sizes) &&
                data.sizes.map((size, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => handleArrayChange('sizes', idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-bwave-blue"
                    />
                    <button
                      onClick={() => removeArrayItem('sizes', idx)}
                      className="px-2 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              <button
                onClick={() => addArrayItem('sizes')}
                className="w-full mt-2 px-3 py-2 bg-bwave-blue/20 hover:bg-bwave-blue/30 text-bwave-blue rounded text-sm transition-colors"
              >
                + Add Size
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">🎨 Colors</h2>
            <div className="space-y-2">
              {Array.isArray(data.colors) &&
                data.colors.map((color, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleArrayChange('colors', idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-bwave-blue"
                    />
                    <button
                      onClick={() => removeArrayItem('colors', idx)}
                      className="px-2 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              <button
                onClick={() => addArrayItem('colors')}
                className="w-full mt-2 px-3 py-2 bg-bwave-blue/20 hover:bg-bwave-blue/30 text-bwave-blue rounded text-sm transition-colors"
              >
                + Add Color
              </button>
            </div>
          </div>
        </div>

        {/* Care & Sizing */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Care Instructions</label>
            <textarea
              value={data.care_instructions || ''}
              onChange={(e) => handleFieldChange('care_instructions', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
            />
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Size/Fit Guide</label>
            <textarea
              value={data.size_fit || ''}
              onChange={(e) => handleFieldChange('size_fit', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-bwave-blue"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">🏷️ Tags</h2>
          <div className="space-y-2">
            {Array.isArray(data.tags) &&
              data.tags.map((tag, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleArrayChange('tags', idx, e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-bwave-blue"
                  />
                  <button
                    onClick={() => removeArrayItem('tags', idx)}
                    className="px-2 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            <button
              onClick={() => addArrayItem('tags')}
              className="w-full mt-2 px-3 py-2 bg-bwave-blue/20 hover:bg-bwave-blue/30 text-bwave-blue rounded text-sm transition-colors"
            >
              + Add Tag
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-slate-700">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-bwave-blue hover:bg-bwave-purple text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : '✅ Confirm & Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
