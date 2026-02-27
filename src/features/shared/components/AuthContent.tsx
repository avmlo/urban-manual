'use client';

import { useState, useCallback, useId, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';

/**
 * AuthContent - Login/signup view for IntelligentDrawer
 */
const AuthContent = memo(function AuthContent() {
  const router = useRouter();
  const { signIn, signUp, signInWithApple } = useAuth();
  const { close, navigate } = useIntelligentDrawer();
  const uniqueId = useId();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name);
        setSuccess('Account created! Please check your email to verify.');
        setName('');
        setEmail('');
        setPassword('');
      } else {
        await signIn(email, password);
        // Navigate to account after successful login
        navigate('account', {});
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [isSignUp, email, password, name, signUp, signIn, navigate]);

  const handleAppleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      // OAuth will redirect, drawer will close on success
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Apple');
      setLoading(false);
    }
  }, [signInWithApple]);

  const toggleMode = useCallback(() => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
  }, [isSignUp]);

  return (
    <div className="flex flex-col h-full bg-[var(--editorial-bg)]">
      {/* Welcome text */}
      <div className="flex-shrink-0 px-5 sm:px-6 pt-4 sm:pt-6 pb-5">
        <h1
          className="text-xl font-normal text-[var(--editorial-text-primary)] tracking-tight"
          style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
        >
          {isSignUp ? 'Begin your journey' : 'Welcome back'}
        </h1>
        <p className="text-sm text-[var(--editorial-text-secondary)] mt-1">
          {isSignUp ? 'Create an account to save your favorite places' : 'Sign in to access your saved places'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-safe">
        {/* Apple Sign In */}
        <button
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full px-6 py-3.5 bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] rounded-lg hover:opacity-90 active:opacity-80 transition-opacity text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
        >
          <svg className="h-5 w-5 sm:h-4.5 sm:w-4.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </button>

        {/* Divider */}
        <div className="relative my-6 sm:my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--editorial-border)]" />
          </div>
          <div className="relative flex justify-center text-xs tracking-wider">
            <span className="px-4 bg-[var(--editorial-bg)] text-[var(--editorial-text-tertiary)] font-medium">
              OR CONTINUE WITH EMAIL
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field (Sign Up only) */}
          {isSignUp && (
            <div>
              <label htmlFor={`auth-name-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
                Name
              </label>
              <input
                id={`auth-name-${uniqueId}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                autoComplete="name"
                className="w-full px-4 py-3 border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--editorial-accent)]/20 focus:border-[var(--editorial-accent)] transition-all duration-200 text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                placeholder="Your name"
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor={`auth-email-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
              Email
            </label>
              <input
                id={`auth-email-${uniqueId}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--editorial-accent)]/20 focus:border-[var(--editorial-accent)] transition-all duration-200 text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                placeholder="you@example.com"
              />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor={`auth-password-${uniqueId}`} className="block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]">
              Password
            </label>
            <div className="relative">
              <input
                id={`auth-password-${uniqueId}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full px-4 pr-12 py-3 border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--editorial-accent)]/20 focus:border-[var(--editorial-accent)] transition-all duration-200 text-sm text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] active:text-[var(--editorial-text-primary)] transition-colors rounded-lg hover:bg-[var(--editorial-border-subtle)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp ? (
              <p className="text-xs text-[var(--editorial-text-tertiary)] mt-2">Minimum 6 characters</p>
            ) : (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push('/auth/forgot-password');
                  }}
                  className="text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert variant="default" className="rounded-xl bg-[var(--editorial-accent)]/10 border-[var(--editorial-accent)]/30">
              <CheckCircle2 className="h-4 w-4 text-[var(--editorial-accent)]" />
              <AlertTitle className="text-[var(--editorial-accent)]">Success</AlertTitle>
              <AlertDescription className="text-[var(--editorial-text-secondary)]">{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-[var(--editorial-accent)] text-white rounded-lg hover:opacity-90 active:opacity-80 transition-all duration-200 text-sm font-medium disabled:opacity-50 mt-6 shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-6 mb-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors py-2"
          >
            {isSignUp ? (
              <>Already have an account? <span className="font-medium">Sign in</span></>
            ) : (
              <>Don&apos;t have an account? <span className="font-medium">Create one</span></>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] pb-safe">
        <p className="text-xs text-[var(--editorial-text-tertiary)] text-center">
          By continuing, you agree to our{' '}
          <a href="/privacy" className="hover:text-[var(--editorial-text-primary)] underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
});

export default AuthContent;
