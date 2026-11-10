import React, { forwardRef } from 'react';
import Spinner from './Spinner';

const Button = forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    className = '',
    ...props
  },
  ref
) {
  const variantStyles = {
    primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm active:scale-[0.98]',
    secondary: 'bg-card-muted text-main hover:bg-border/60 border border-border shadow-xs active:scale-[0.98]',
    outline: 'border border-border text-main hover:bg-card-muted/80 bg-transparent active:scale-[0.98]',
    ghost: 'text-muted hover:text-main hover:bg-card-muted/60 bg-transparent',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98]',
    subtle: 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/20'
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs md:text-sm px-4 py-2 rounded-xl gap-2',
    lg: 'text-sm md:text-base px-5 py-2.5 rounded-xl gap-2.5',
    icon: 'p-2 rounded-lg'
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${currentVariant} ${currentSize} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className={variant === 'primary' ? 'text-primary-fg' : 'text-current'} />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;

