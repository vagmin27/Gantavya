import React from 'react';
import { Compass } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Compass,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action = null,
  className = ''
}) {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm md:text-base font-bold font-heading text-main">
          {title}
        </h4>
        <p className="text-xs text-muted leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

