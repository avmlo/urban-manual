'use client';

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AdminEnrichPage() {
  const { user } = useAuth()
  const [slug, setSlug] = useState('')
  const [output, setOutput] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!user?.email) { setOutput({ error: 'Please sign in' }); return }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        throw new Error('Not authenticated')
      }
      const res = await fetch('/api/enrich-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: slug || undefined })
      })
      const json = await res.json()
      setOutput(json)
    } catch (e: any) {
      setOutput({ error: e?.message || 'failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-12 min-h-screen dark:text-white">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Google Enrichment</h1>
        <span className="text-sm text-gray-600 dark:text-gray-400 mb-6">Run enrichment for a single slug (recommended) or leave empty to process a small batch.</span>

        <div className="flex items-center gap-2 mb-4">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="destination slug (optional)"
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 outline-none"
          />
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 rounded bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run'}
          </button>
        </div>

        {output && (
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-[50vh]">
{JSON.stringify(output, null, 2)}
          </pre>
        )}
      </div>
    </main>
  )
}

