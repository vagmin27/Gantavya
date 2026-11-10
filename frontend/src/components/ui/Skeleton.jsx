import React from 'react';

export default function Skeleton({ className = '', variant = 'rect', ...props }) {
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4'
  };

  const currentVariant = variantStyles[variant] || variantStyles.rect;

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`animate-pulse bg-card-muted/80 ${currentVariant} ${className}`}
      {...props}
    />
  );
}

