'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type SearchLog = {
  id: number;
  created_at: string;
  interaction_type: string;
  user_id: string | null;
  metadata: any;
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '') as string;
const SUPABASE_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') as string;

export default function AdminSearchesPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
        const { data: { user } } = await supabase.auth.getUser();
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!user || (adminEmails.length > 0 && !adminEmails.includes(user.email || ''))) {
          setError('Unauthorized');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_interactions')
          .select('id, created_at, interaction_type, user_id, metadata')
          .eq('interaction_type', 'search')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setLogs(data as any);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Recent Searches</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Query</th>
              <th className="py-2 pr-4">City</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Count</th>
              <th className="py-2 pr-4">Source</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const q = log.metadata?.query || '';
              const intent = log.metadata?.intent || {};
              const filters = log.metadata?.filters || {};
              const count = log.metadata?.count ?? '';
              const source = log.metadata?.source || '';
              return (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{log.user_id || 'anon'}</td>
                  <td className="py-2 pr-4 max-w-[360px] truncate" title={q}>{q}</td>
                  <td className="py-2 pr-4">{intent.city || filters.city || ''}</td>
                  <td className="py-2 pr-4">{intent.category || filters.category || ''}</td>
                  <td className="py-2 pr-4">{count}</td>
                  <td className="py-2 pr-4">{source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


