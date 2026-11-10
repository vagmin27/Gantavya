import React, { useState } from 'react';

export default function Tooltip({
  content,
  children,
  position = 'top',
  className = ''
}) {
  const [visible, setVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`absolute ${positionStyles[position]} z-50 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900/95 border border-slate-700/60 rounded-lg shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in duration-100`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

