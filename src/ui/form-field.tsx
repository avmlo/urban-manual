/**
 * Form Field Component with Validation
 *
 * Provides real-time validation feedback for form inputs.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Validation rules
export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

// Common validators
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = 'Please enter a valid email'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  minLength: (
    min: number,
    message = `Must be at least ${min} characters`
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length >= min;
    },
    message,
  }),

  maxLength: (
    max: number,
    message = `Must be no more than ${max} characters`
  ): ValidationRule => ({
    validate: (value) => value.length <= max,
    message,
  }),

  pattern: (
    regex: RegExp,
    message = 'Invalid format'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  passwordStrength: (
    message = 'Password must contain uppercase, lowercase, number, and be 8+ characters'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value)
      );
    },
    message,
  }),

  match: (
    getOtherValue: () => string,
    message = 'Values do not match'
  ): ValidationRule => ({
    validate: (value) => value === getOtherValue(),
    message,
  }),

  username: (
    message = 'Username can only contain letters, numbers, underscores, and hyphens'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[a-zA-Z0-9_-]+$/.test(value);
    },
    message,
  }),

  date: (message = 'Please enter a valid date (YYYY-MM-DD)'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
    },
    message,
  }),
};

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Show validation state */
  showValidation?: boolean;
  /** Validate on blur instead of change */
  validateOnBlur?: boolean;
  /** External error message (from server) */
  error?: string;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      className,
      label,
      helperText,
      rules = [],
      showValidation = true,
      validateOnBlur = false,
      error: externalError,
      onValidationChange,
      onChange,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const [internalValue, setInternalValue] = React.useState(
      (value as string) || ''
    );
    const [touched, setTouched] = React.useState(false);
    const [errors, setErrors] = React.useState<string[]>([]);
    const [isDirty, setIsDirty] = React.useState(false);

    const currentValue = value !== undefined ? (value as string) : internalValue;

    // Run validation
    const validate = React.useCallback(
      (val: string): string[] => {
        const validationErrors: string[] = [];
        for (const rule of rules) {
          if (!rule.validate(val)) {
            validationErrors.push(rule.message);
          }
        }
        return validationErrors;
      },
      [rules]
    );

    // Handle change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        setIsDirty(true);

        if (!validateOnBlur && touched) {
          const newErrors = validate(newValue);
          setErrors(newErrors);
          onValidationChange?.(newErrors.length === 0, newErrors);
        }

        onChange?.(e);
      },
      [validateOnBlur, touched, validate, onChange, onValidationChange]
    );

    // Handle blur
    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setTouched(true);
        const newErrors = validate(e.target.value);
        setErrors(newErrors);
        onValidationChange?.(newErrors.length === 0, newErrors);
        onBlur?.(e);
      },
      [validate, onBlur, onValidationChange]
    );

    // Determine validation state
    const hasError = externalError || (touched && errors.length > 0);
    const isValid = touched && !hasError && isDirty && errors.length === 0;
    const displayError = externalError || (touched ? errors[0] : undefined);

    const inputId = props.id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {rules.some((r) => r.message.includes('required')) && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              [displayError && errorId, helperText && helperId]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn(
              'pr-10',
              hasError &&
                'border-red-500 dark:border-red-500 focus-visible:ring-red-500',
              isValid &&
                showValidation &&
                'border-green-500 dark:border-green-500 focus-visible:ring-green-500'
            )}
            {...props}
          />

          {/* Validation icon */}
          {showValidation && touched && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}
        </div>

        {/* Error message */}
        {displayError && (
          <p
            id={errorId}
            className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {displayError}
          </p>
        )}

        {/* Helper text */}
        {helperText && !displayError && (
          <p
            id={helperId}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

/**
 * Password field with strength indicator
 */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  Omit<FormFieldProps, 'type'> & { showStrength?: boolean }
>(({ showStrength = true, rules = [], ...props }, ref) => {
  const [value, setValue] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // Calculate password strength
  const strength = React.useMemo(() => {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }, [value]);

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];

  return (
    <div className="space-y-2">
      <div className="relative">
        <FormField
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          rules={rules}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
          tabIndex={-1}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Strength indicator */}
      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  level < strength
                    ? strengthColors[strength - 1]
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Password strength: {strengthLabels[strength - 1] || 'Too weak'}
          </p>
        </div>
      )}
    </div>
  );
});

PasswordField.displayName = 'PasswordField';
