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
    <>
    <CommandPalette />
    <main className="w-full px-4 sm:px-6 md:px-10 py-16 sm:py-20 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-light">Admin</h1>
            <div className="flex items-center gap-3">
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                <span className="text-xs">⌘</span>K
              </kbd>
              <Link
                href="/"
                className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 -mr-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Exit
              </Link>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 sm:mb-12">
          <AdminNav />
        </div>

        {/* Content - CMS pages get a sidebar */}
        <AdminToastProvider>
          {isCmsPage ? (
            <div className="flex -mx-4 sm:-mx-6 md:-mx-10" style={{ minHeight: 'calc(100vh - 280px)' }}>
              {/* Collections Sidebar - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                <CmsCollectionsSidebar />
              </div>
              {/* Main Content */}
              <div className="flex-1 min-w-0 overflow-hidden px-4 sm:px-6 md:px-8 py-6">
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
