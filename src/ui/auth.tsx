'use client';

import * as React from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared auth component styles - centralized to ensure consistency across auth surfaces.
 * These components provide mobile-optimized touch targets and responsive sizing.
 * Updated to use warm editorial design system.
 */

// Shared style constants for auth components - Editorial Design System
const AUTH_INPUT_CLASSES =
  'w-full px-4 py-4 sm:py-3 border border-[var(--editorial-border)] rounded-lg bg-[var(--editorial-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--editorial-accent)]/20 focus:border-[var(--editorial-accent)] transition-all duration-200 text-base sm:text-sm text-[var(--editorial-text-primary)] min-h-[56px] sm:min-h-[48px] placeholder:text-[var(--editorial-text-tertiary)]';

const AUTH_PRIMARY_BUTTON_CLASSES =
  'w-full px-6 py-4 sm:py-3.5 bg-[var(--editorial-accent)] text-white rounded-lg text-sm sm:text-base font-medium disabled:opacity-50 min-h-[56px] sm:min-h-[48px] shadow-sm hover:opacity-90 active:opacity-80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2';

const AUTH_SECONDARY_BUTTON_CLASSES =
  'w-full px-6 py-3.5 bg-[var(--editorial-text-primary)] text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-90 active:opacity-80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]';

const AUTH_LABEL_CLASSES = 'block text-sm font-medium mb-2 text-[var(--editorial-text-primary)]';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className={AUTH_LABEL_CLASSES}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(AUTH_INPUT_CLASSES, className)}
          ref={ref}
          {...props}
        />
        {hint && (
          <p className="text-xs text-[var(--editorial-text-tertiary)] mt-1.5">{hint}</p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = 'AuthInput';

export interface AuthPasswordInputProps extends Omit<AuthInputProps, 'type'> {
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export const AuthPasswordInput = React.forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ className, label, hint, id, showPassword, onTogglePassword, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [internalShowPassword, setInternalShowPassword] = React.useState(false);
    const isControlled = showPassword !== undefined && onTogglePassword !== undefined;
    const passwordVisible = isControlled ? showPassword : internalShowPassword;

    const handleToggle = () => {
      if (isControlled) {
        onTogglePassword?.();
      } else {
        setInternalShowPassword(!internalShowPassword);
      }
    };

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className={AUTH_LABEL_CLASSES}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={passwordVisible ? 'text' : 'password'}
            className={cn(AUTH_INPUT_CLASSES, 'pr-14', className)}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={handleToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] active:text-[var(--editorial-text-primary)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--editorial-border-subtle)]"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            {passwordVisible ? (
              <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" />
            ) : (
              <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
        {hint && (
          <p className="text-xs text-[var(--editorial-text-tertiary)] mt-1.5">{hint}</p>
        )}
      </div>
    );
  }
);
AuthPasswordInput.displayName = 'AuthPasswordInput';

export interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

export const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className, children, loading, loadingText, disabled, variant = 'primary', ...props }, ref) => {
    const baseClasses = variant === 'primary' ? AUTH_PRIMARY_BUTTON_CLASSES : AUTH_SECONDARY_BUTTON_CLASSES;

    return (
      <button
        className={cn(baseClasses, className)}
        disabled={disabled || loading}
        ref={ref}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {loading ? loadingText || children : children}
      </button>
    );
  }
);
AuthButton.displayName = 'AuthButton';

export interface AuthDividerProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthDivider({ children, className }: AuthDividerProps) {
  return (
    <div className={cn('relative my-6 sm:my-5', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--editorial-border)]" />
      </div>
      <div className="relative flex justify-center text-xs tracking-wider">
        <span className="px-4 bg-[var(--editorial-bg)] text-[var(--editorial-text-tertiary)] font-medium">
          {children}
        </span>
      </div>
    </div>
  );
}

// Export style constants for cases where direct class usage is needed
export const authStyles = {
  input: AUTH_INPUT_CLASSES,
  primaryButton: AUTH_PRIMARY_BUTTON_CLASSES,
  secondaryButton: AUTH_SECONDARY_BUTTON_CLASSES,
  label: AUTH_LABEL_CLASSES,
} as const;
