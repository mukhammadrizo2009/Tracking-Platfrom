import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const iconVariants = {
    danger: {
      bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60',
      icon: <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />,
      buttonVariant: 'danger' as const,
    },
    warning: {
      bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
      icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />,
      buttonVariant: 'primary' as const,
    },
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/60',
      icon: <Info className="w-5 h-5 sm:w-6 sm:h-6" />,
      buttonVariant: 'primary' as const,
    },
  };

  const currentVariant = iconVariants[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Confirmation Dialog */}
      <div
        className="relative w-full max-w-md bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 my-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-200/60 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 pr-6">
          <div
            className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${currentVariant.bg}`}
          >
            {currentVariant.icon}
          </div>

          <div className="space-y-1">
            <h3
              id="confirm-modal-title"
              className="text-base sm:text-lg font-bold text-surface-900 dark:text-white tracking-tight"
            >
              {title}
            </h3>
            <p
              id="confirm-modal-desc"
              className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-200/70 dark:border-surface-800/80">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={currentVariant.buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
