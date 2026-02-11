'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminNav } from './AdminNav';
import { AdminToastProvider } from './AdminToast';
import { CommandPalette } from './CommandPalette';
import { CmsCollectionsSidebar } from './CmsCollectionsSidebar';

const CMS_ROUTES = [
  '/admin/destinations',
  '/admin/cities',
  '/admin/countries',
  '/admin/neighborhoods',
  '/admin/brands',
  '/admin/architects',
  '/admin/categories',
];

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAdmin = (user?.app_metadata as Record<string, unknown> | null)?.role === 'admin';
  const isCmsPage = CMS_ROUTES.some(route => pathname?.startsWith(route));

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/account');
    }
  }, [isAdmin, loading, router]);

  if (loading || (!isAdmin && !loading)) {
    return (
      <main className="w-full px-6 md:px-10 py-20 bg-[var(--editorial-bg)] min-h-screen">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--editorial-text-tertiary)]" />
          <p className="mt-3 text-sm text-[var(--editorial-text-secondary)]">
            Checking access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
    <CommandPalette />
    <main className="w-full min-h-screen bg-[var(--editorial-bg)]">
      {/* Sticky toolbar header - mirrors trip detail toolbar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 px-4 sm:px-6 md:px-10 h-12 bg-[var(--editorial-bg)]/95 backdrop-blur-md border-b border-[var(--editorial-border)]/50">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-[var(--editorial-text-primary)]">Admin</h1>
            <AdminNav />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-[11px] text-[var(--editorial-text-tertiary)] truncate max-w-[160px]">{user?.email}</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[var(--editorial-text-tertiary)] font-mono px-1.5 py-0.5 rounded-md border border-[var(--editorial-border-subtle)]">
              <span className="text-xs">⌘</span>K
            </kbd>
            <Link
              href="/"
              className="text-xs font-medium text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors px-2.5 py-1 rounded-md hover:bg-[var(--editorial-border-subtle)]"
            >
              Exit
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10">
        {/* Content - CMS pages get a sidebar */}
        <AdminToastProvider>
          {isCmsPage ? (
            <div className="flex gap-0" style={{ minHeight: 'calc(100vh - 200px)' }}>
              {/* Collections Sidebar - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                <CmsCollectionsSidebar />
              </div>
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {children}
              </div>
            </div>
          ) : (
            children
          )}
        </AdminToastProvider>
      </div>
    </main>
    </>
  );
}
