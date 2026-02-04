'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { LoginDrawer } from '@/components/LoginDrawer';

function LoginPageContent() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Open drawer when page loads
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Navigate back after a short delay to allow animation
    setTimeout(() => {
      router.push('/');
    }, 300);
  };

  // Render drawer over transparent background (drawer has its own backdrop)
  return (
    <div className="min-h-screen bg-transparent">
      <LoginDrawer isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
