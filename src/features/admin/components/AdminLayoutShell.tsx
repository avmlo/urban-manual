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
    {/* Full-viewport app shell, matching /trips layout: toolbar + content fill remaining height */}
    <main className="h-[calc(100dvh-68px)] md:h-[calc(100dvh-84px)] overflow-hidden bg-[var(--editorial-bg)] flex flex-col">
      {/* Toolbar header - mirrors trip detail toolbar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 md:px-10 h-11 bg-[var(--editorial-bg)]/95 backdrop-blur-md border-b border-[var(--editorial-border)]/50">
        <div className="w-full flex items-center justify-between">
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

      {/* Content area - fills remaining height, panels scroll independently */}
      <div className="flex-1 overflow-hidden">
        <AdminToastProvider>
          {isCmsPage ? (
            <div className="flex h-full">
              {/* Collections Sidebar - hidden on mobile, scrolls independently */}
              <div className="hidden md:block flex-shrink-0 overflow-y-auto overscroll-contain">
                <div className="py-4 pl-4 sm:pl-6 md:pl-10">
                  <CmsCollectionsSidebar />
                </div>
              </div>
              {/* Main Content - fills height, ContentManager handles its own scroll */}
              <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
                <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 md:px-8 py-4">
                  {children}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto overscroll-contain">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6">
                {children}
              </div>
            </div>
          )}
        </AdminToastProvider>
      </div>
    </main>
    </>
  );
}
