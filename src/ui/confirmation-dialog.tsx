/**
 * Confirmation Dialog Component
 *
 * Modal for confirming destructive or important actions.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { X, AlertTriangle, Trash2, LogOut, AlertCircle } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useAccessibility';

interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Variant for different action types */
  variant?: 'default' | 'danger' | 'warning';
  /** Whether the confirm action is loading */
  isLoading?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  icon,
}: ConfirmationDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Close on escape key
  useEscapeKey(onClose, isOpen);

  // Handle confirm
  const handleConfirm = async () => {
    await onConfirm();
  };

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  React.useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    default: <AlertCircle className="w-6 h-6 text-gray-500" />,
    danger: <Trash2 className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
  };

  const confirmButtonVariant = {
    default: 'default' as const,
    danger: 'destructive' as const,
    warning: 'default' as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-lg shadow-xl',
          'w-full max-w-md mx-4 p-6',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800">
          {icon || icons[variant]}
        </div>

        {/* Content */}
        <div className="text-center">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>
          <p
            id="dialog-description"
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
          >
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant[variant]}
            onClick={handleConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing confirmation dialog state
 *
 * Usage:
 * ```tsx
 * const { showConfirmation, dialogProps } = useConfirmation();
 *
 * const handleDelete = async () => {
 *   const confirmed = await showConfirmation({
 *     title: 'Delete item?',
 *     description: 'This action cannot be undone.',
 *     variant: 'danger',
 *   });
 *
 *   if (confirmed) {
 *     await deleteItem();
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmationDialog {...dialogProps} />
 *   </>
 * );
 * ```
 */
export function useConfirmation() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger' | 'warning';
    isLoading: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    title: '',
    description: '',
    isLoading: false,
    resolve: null,
  });

  const showConfirmation = React.useCallback(
    (options: {
      title: string;
      description: string;
      confirmText?: string;
      cancelText?: string;
      variant?: 'default' | 'danger' | 'warning';
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          ...options,
          isLoading: false,
          resolve,
        });
      });
    },
    []
  );

  const handleClose = React.useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleConfirm = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, isLoading: false, resolve: null }));
  }, [state.resolve]);

  const dialogProps: ConfirmationDialogProps = {
    isOpen: state.isOpen,
    onClose: handleClose,
    onConfirm: handleConfirm,
    title: state.title,
    description: state.description,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    variant: state.variant,
    isLoading: state.isLoading,
  };

  return {
    showConfirmation,
    dialogProps,
  };
}

/**
 * Pre-configured confirmation dialogs for common actions
 */

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName = 'item',
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemName}?`}
      description={`This action cannot be undone. The ${itemName} will be permanently deleted.`}
      confirmText="Delete"
      variant="danger"
      isLoading={isLoading}
    />
  );
}

export function LogoutConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Sign out?"
      description="You will need to sign in again to access your account."
      confirmText="Sign out"
      icon={<LogOut className="w-6 h-6 text-gray-500" />}
      isLoading={isLoading}
    />
  );
}

export function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard changes?"
      description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmText="Discard"
      cancelText="Keep editing"
      variant="warning"
    />
  );
}
