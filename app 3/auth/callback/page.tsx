'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const next = searchParams.get('next') || '/';
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors from query params
      if (error) {
        const errorMessage = errorDescription || error;
        router.push(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
        return;
      }

      // Check URL hash for errors
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashError = hashParams.get('error');
      
      if (hashError) {
        router.push(`/auth/login?error=${encodeURIComponent(hashError)}`);
        return;
      }

      // Let Supabase handle the session automatically
      // With detectSessionInUrl: true, Supabase will automatically process both:
      // - Query params (?code=...) for PKCE flow
      // - Hash fragments (#access_token=...) for implicit flow
      
      // Wait for Supabase to process the URL and detect the session
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          // Successfully authenticated
          router.push(next);
          return;
        }
        
        if (sessionError && !sessionError.message?.includes('JWT')) {
          // If there's a real error (not just "no session"), show it
          console.error('Session error:', sessionError);
          break;
        }
        
        attempts++;
      }

      // If we still don't have a session after waiting, try manual exchange
      const code = searchParams.get('code');
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            
            // If it's a code verifier error, the issue is that PKCE flow wasn't properly initiated
            // This usually means the redirect domain changed or storage was cleared
            if (exchangeError.message?.includes('code verifier') || exchangeError.message?.includes('non-empty')) {
              router.push(`/auth/login?error=${encodeURIComponent('Authentication failed. Please try signing in again. If the problem persists, clear your browser cache and try again.')}`);
              return;
            }
            
            router.push(`/auth/login?error=${encodeURIComponent(exchangeError.message || 'Failed to authenticate')}`);
            return;
          }

          if (data?.session) {
            router.push(next);
            return;
          }
        } catch (err: any) {
          console.error('OAuth callback error:', err);
          router.push(`/auth/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
          return;
        }
      }

      // Final check - wait one more time for Supabase auto-detection
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      
      if (finalSession) {
        router.push(next);
        return;
      }

      // Still no session - show error
      router.push(`/auth/login?error=${encodeURIComponent('Authentication failed. Please try signing in again.')}`);
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-500 text-sm mb-2">Completing sign in...</div>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">Loading...</div>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

