'use client';

import { LibraryPage } from '@/features/library';
import { CmsLibraryShell } from '@/features/admin/components/cms/CmsLibraryShell';

export const dynamic = 'force-dynamic';

export default function AdminResourcesPage() {
  return (
    <CmsLibraryShell defaultCollection="resources">
      {({ collectionSwitcher }) => (
        <LibraryPage headerSlot={collectionSwitcher} />
      )}
    </CmsLibraryShell>
  );
}
