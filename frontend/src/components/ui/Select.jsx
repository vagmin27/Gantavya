import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    children,
    className = '',
    containerClassName = '',
    id,
    ...props
  },
  ref
) {
  const selectId = id || (label ? `sel_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-main">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={`w-full bg-card border text-xs md:text-sm text-main rounded-xl px-3.5 py-2 pr-9 transition-all appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:bg-card-muted ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-border focus:border-primary'
          } ${className}`}
          {...props}
        >
          {children ||
            options.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={val} value={val} className="bg-surface text-main">
                  {lbl}
                </option>
              );
            })}
        </select>
        <div className="absolute right-3 text-muted pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
