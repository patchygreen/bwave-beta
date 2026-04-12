'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      aria-busy={loading}
      className="text-sm text-slate-600 hover:text-bwave-blue disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-bwave-blue focus:ring-offset-2 rounded px-2 py-1 transition-colors"
    >
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
