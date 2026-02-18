'use client';

import { useToast } from "@/hooks/useToast";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DestinationLibrary } from '@/features/admin/components/cms/destination-library';
import { CmsLibraryShell } from '@/features/admin/components/cms/CmsLibraryShell';

export const dynamic = 'force-dynamic';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const { Dialog: ConfirmDialogComponent } = useConfirmDialog();

  return (
    <CmsLibraryShell defaultCollection="destinations">
      {({ collectionSwitcher }) => (
        <>
          <DestinationLibrary toast={toast} headerSlot={collectionSwitcher} />
          <ConfirmDialogComponent />
        </>
      )}
    </CmsLibraryShell>
  );
}
