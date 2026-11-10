import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}) {
  const variantStyles = {
    default: 'bg-card-muted text-main border-border',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    accent: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    outline: 'border-border text-muted bg-transparent'
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-[11px] px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-xs px-3 py-1 rounded-full font-medium'
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;
  const currentSize = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 border ${currentVariant} ${currentSize} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

