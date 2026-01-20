'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Command } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNav } from './AdminNav';
import { CommandPalette } from './CommandPalette';
import { AdminQueryProvider } from '../providers/QueryProvider';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/account');
    }
  }, [isAdmin, loading, router]);

  if (loading || (!isAdmin && !loading)) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Checking access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AdminQueryProvider>
      <CommandPalette />
      <KeyboardShortcutsPanel />
      <main className="w-full px-4 sm:px-6 md:px-10 py-16 sm:py-20 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header - Matches account page */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-light">Admin</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {}}
                  className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <Command className="w-3 h-3" />
                  <span>Search</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </button>
                <Link
                  href="/"
                  className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Exit
                </Link>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>

          {/* Tab Navigation - Matches account page */}
          <div className="mb-8 sm:mb-12">
            <AdminNav />
          </div>

          {/* Content */}
          {children}
        </div>
      </main>
    </AdminQueryProvider>
  );
}
