import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Dialog({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = ''
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${maxWidth} bg-card border border-border rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in zoom-in-95 duration-150 ${className}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold font-heading text-main tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-muted mt-1">
                {description}
              </p>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-main p-1.5 rounded-lg hover:bg-card-muted transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

