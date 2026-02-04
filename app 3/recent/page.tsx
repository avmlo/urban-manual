'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecentPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to account page with recent tab
    router.replace('/account?tab=visited');
  }, [router]);

  return null;
}

