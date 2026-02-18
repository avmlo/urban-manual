'use client';

import { useToast } from "@/hooks/useToast";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { DestinationLibrary } from '@/features/admin/components/cms/destination-library';

export const dynamic = 'force-dynamic';

export default function AdminDestinationsPage() {
  const toast = useToast();
  const { Dialog: ConfirmDialogComponent } = useConfirmDialog();

  return (
    <div className="space-y-6">
      <DestinationLibrary toast={toast} />
      <ConfirmDialogComponent />
    </div>
  );
}
