import React, { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    rows = 3,
    className = '',
    containerClassName = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `txt_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-main">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`w-full bg-card border text-xs md:text-sm text-main placeholder-muted rounded-xl p-3 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:bg-card-muted ${
          error
            ? 'border-rose-500 focus:border-rose-500'
            : 'border-border focus:border-primary'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
