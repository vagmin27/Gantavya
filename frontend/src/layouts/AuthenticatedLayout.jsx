import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import ThemeToggle from '../components/ui/ThemeToggle';
import Dropdown from '../components/ui/Dropdown';
import {
  Compass,
  MapPin,
  Layers,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Sparkles,
  LayoutDashboard,
  Globe2,
  User
} from 'lucide-react';

export default function AuthenticatedLayout({
  children,
  currentTab = null,
  onTabChange,
  activeTripTitle = null
}) {
  let user = null;
  let logout = () => {};

  try {
    const auth = useAuth();
    user = auth.user;
    logout = auth.logout;
  } catch (e) {
    user = { name: 'Explorer', email: 'explorer@gantavya.io', role: 'user' };
  }

  // Safe router hooks
  let location = { pathname: '/trips' };
  let navigate = null;
  try {
    location = useLocation();
  } catch (e) {
    location = { pathname: currentTab ? `/${currentTab}` : '/trips' };
  }
  try {
    navigate = useNavigate();
  } catch (e) {
    navigate = null;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { key: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'trips', path: '/trips', label: 'My Trips', icon: Compass },
    { key: 'explore', path: '/explore', label: 'Explore', icon: Globe2 },
    { key: 'profile', path: '/profile', label: 'Profile', icon: User },
    { key: 'settings', path: '/settings', label: 'Settings', icon: Settings },
    { key: 'architecture', path: '/architecture', label: 'Architecture', icon: Layers, badge: '2.4' }
  ];

  const handleNavClick = (item) => {
    if (onTabChange) {
      onTabChange(item.key);
    }
    if (navigate) {
      navigate(item.path);
    }
    setSidebarOpen(false);
  };

  const isItemActive = (item) => {
    if (currentTab) {
      return currentTab === item.key;
    }
    if (item.path === '/trips' && location.pathname.startsWith('/trips')) {
      return true;
    }
    return location.pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-bg text-main flex flex-col md:flex-row transition-colors">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen bg-surface border-r border-border transition-all duration-200 flex flex-col justify-between ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div
            onClick={() => navigate ? navigate('/dashboard') : (onTabChange && onTabChange('dashboard'))}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg shadow-sm font-heading">
              G
            </span>
            {(!sidebarCollapsed || sidebarOpen) && (
              <div>
                <span className="font-extrabold text-base tracking-tight font-heading text-main">
                  Gantavya
                </span>
                <span className="block text-[10px] text-muted font-mono -mt-0.5">
                  Travel SaaS Platform
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-muted hover:text-main p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-fg shadow-xs font-bold'
                    : 'text-muted hover:text-main hover:bg-card-muted'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(!sidebarCollapsed || sidebarOpen) && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {item.badge && (!sidebarCollapsed || sidebarOpen) && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-card-muted text-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with User Details */}
        <div className="p-3 border-t border-border space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-card-muted border border-border/60">
            <Avatar name={user?.name} size="sm" status="online" />
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold text-main truncate">{user?.name}</div>
                <div className="text-[10px] text-muted truncate">{user?.email}</div>
              </div>
            )}
            {(!sidebarCollapsed || sidebarOpen) && (
              <button
                onClick={logout}
                title="Log out"
                className="text-muted hover:text-rose-500 p-1 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-border px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted hover:text-main p-2 rounded-xl hover:bg-card-muted transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {activeTripTitle ? (
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                <span
                  onClick={() => navigate ? navigate('/trips') : (onTabChange && onTabChange('trips'))}
                  className="text-muted hover:text-main cursor-pointer"
                >
                  Trips
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted" />
                <span className="font-bold text-main truncate max-w-xs">{activeTripTitle}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading text-main tracking-tight">
                  {location.pathname === '/dashboard'
                    ? 'Dashboard'
                    : location.pathname.startsWith('/trips')
                    ? 'Trip Workspace & Planner'
                    : location.pathname === '/explore'
                    ? 'Destination Discovery'
                    : location.pathname === '/profile'
                    ? 'Traveller Profile'
                    : location.pathname === '/settings'
                    ? 'System Settings'
                    : currentTab === 'trips'
                    ? 'Trip Workspace & Planner'
                    : 'Architecture Blueprint'}
                </h2>
              </div>
            )}
          </div>

          {/* Right Toolbar */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Profile Dropdown */}
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 p-1 rounded-xl hover:bg-card-muted transition-colors cursor-pointer">
                  <Avatar name={user?.name} size="sm" />
                </div>
              }
            >
              {({ close }) => (
                <div className="p-1 space-y-1 text-xs">
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="font-bold text-main">{user?.name}</p>
                    <p className="text-[11px] text-muted truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">
                      {user?.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      close();
                      if (navigate) navigate('/profile');
                      else if (onTabChange) onTabChange('profile');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-main hover:bg-card-muted transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> Traveller Profile
                  </button>

                  <button
                    onClick={() => {
                      close();
                      if (navigate) navigate('/settings');
                      else if (onTabChange) onTabChange('settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-main hover:bg-card-muted transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Preferences & Settings
                  </button>

                  <button
                    onClick={() => {
                      close();
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-500/10 font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
