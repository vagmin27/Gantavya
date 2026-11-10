import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Laptop }
  ];

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className={`inline-flex items-center p-1 rounded-xl bg-card-muted border border-border text-xs ${className}`}
    >
      {themes.map(({ key, label, icon: Icon }) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            title={`Switch to ${label} theme`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              isActive
                ? 'bg-surface text-main shadow-sm font-semibold'
                : 'text-muted hover:text-main'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {showLabel && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
