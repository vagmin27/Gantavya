import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const currentTab = value !== undefined ? value : activeTab;
  const handleTabChange = (val) => {
    if (onValueChange) onValueChange(val);
    if (value === undefined) setActiveTab(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab: currentTab, setActiveTab: handleTabChange }}>
      <div className={`space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className = '' }) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-xl bg-card-muted border border-border text-xs ${className}`}
    >
      {children}
    </div>
  );
}

export function TabTrigger({ value, children, className = '', disabled = false }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
        isActive
          ? 'bg-surface text-main shadow-xs'
          : 'text-muted hover:text-main'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function TabContent({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className={`animate-in fade-in duration-150 ${className}`}>
      {children}
    </div>
  );
}

