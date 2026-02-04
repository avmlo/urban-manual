'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CollectionsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to account page with collections tab
    router.replace('/account?tab=collections');
  }, [router]);

  return null;
}

