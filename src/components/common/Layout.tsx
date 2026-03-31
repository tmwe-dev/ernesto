import React, { useState } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  Upload,
  BookOpen,
  Brain,
  Search,
  Heart,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'import' | 'knowledge-base' | 'memory';
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [breadcrumb, setBreadcrumb] = React.useState<string[]>([
    'Dashboard',
  ]);

  const memoryHealth = 78;
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-900 text-emerald-200';
    if (score >= 60) return 'bg-yellow-900 text-yellow-200';
    return 'bg-red-900 text-red-200';
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: currentPage === 'dashboard',
    },
    {
      id: 'import',
      label: 'Import',
      icon: Upload,
      active: currentPage === 'import',
    },
    {
      id: 'knowledge-base',
      label: 'Knowledge Base',
      icon: BookOpen,
      active: currentPage === 'knowledge-base',
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: Brain,
      active: currentPage === 'memory',
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full transition-all duration-300 z-50 ${
          sidebarExpanded ? 'w-60' : 'w-16'
        } bg-slate-900 border-r border-slate-800 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-slate-800 overflow-hidden">
          <img
            src="/ernesto-logo.png"
            alt="ERNESTO"
            className={`object-contain transition-all duration-300 ${
              sidebarExpanded ? 'h-14 w-14' : 'h-10 w-10'
            } rounded-full ring-2 ring-cyan-500/30`}
          />
          {sidebarExpanded && (
            <span className="ml-3 text-lg font-bold text-cyan-400 tracking-wide">ERNESTO</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-3">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`/${item.id === 'dashboard' ? '' : item.id}`}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-cyan-900 text-cyan-100'
                  : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarExpanded && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </a>
          ))}
        </nav>

        {/* Toggle Button */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex items-center justify-center py-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarExpanded ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarExpanded ? 'ml-60' : 'ml-16'}`}>
        {/* Top Bar */}
        <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm">
            {breadcrumb.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                {idx > 0 && <span className="text-slate-600">/</span>}
                <span className={idx === breadcrumb.length - 1 ? 'text-slate-100' : 'text-slate-500'}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search..."
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-48"
              />
              <Search size={16} className="absolute right-3 top-1.5 text-slate-500" />
            </div>

            {/* Memory Health Badge */}
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${getHealthColor(memoryHealth)}`}
            >
              <Heart size={16} />
              <span className="text-sm font-medium">{memoryHealth}%</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-950">
          {children}
        </div>
      </div>
    </div>
  );
};
