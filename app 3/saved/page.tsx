'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SavedPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to account page with saved tab
    router.replace('/account?tab=saved');
  }, [router]);

  return null;
}

