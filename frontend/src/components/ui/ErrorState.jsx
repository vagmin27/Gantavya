import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry = null,
  className = ''
}) {
  return (
    <div
      role="alert"
      className={`p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center max-w-md mx-auto space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-5 h-5" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold font-heading text-main">
          {title}
        </h4>
        <p className="text-xs text-rose-500/90 font-medium">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

