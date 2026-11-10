import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon = null,
    rightIcon = null,
    className = '',
    containerClassName = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-main">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-muted pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-card border text-xs md:text-sm text-main placeholder-muted rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:bg-card-muted ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-border focus:border-primary'
          } ${leftIcon ? 'pl-9' : 'px-3.5'} ${rightIcon ? 'pr-9' : 'px-3.5'} py-2 ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-muted flex items-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;

