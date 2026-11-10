import React from 'react';

export default function Avatar({
  name = '',
  src = null,
  size = 'md',
  status = null,
  className = ''
}) {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const statusSizeMap = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const currentStatusSize = statusSizeMap[size] || statusSizeMap.md;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          className={`${currentSize} rounded-full object-cover border border-border`}
        />
      ) : (
        <div
          className={`${currentSize} rounded-full bg-primary/15 text-primary border border-primary/25 font-bold flex items-center justify-center tracking-wide`}
        >
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${currentStatusSize} rounded-full ring-2 ring-surface ${
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'busy'
              ? 'bg-rose-500'
              : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
}

