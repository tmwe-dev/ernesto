import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Database, Home, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/import', label: 'Import', icon: FileText },
    { path: '/kb', label: 'Knowledge Base', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-ernesto-surface-950">
      {/* Sidebar */}
      <aside className="w-64 bg-ernesto-surface-900 border-r border-ernesto-surface-700 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-8 border-b border-ernesto-surface-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-ernesto-primary-500 to-ernesto-accent-500">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold ernesto-text-gradient">ERNESTO</h1>
              <p className="text-xs text-ernesto-surface-400">AI Pricelist Engine</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive(path)
                  ? 'bg-ernesto-primary-600 text-white shadow-lg'
                  : 'text-ernesto-surface-300 hover:bg-ernesto-surface-800 hover:text-ernesto-surface-50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6 border-t border-ernesto-surface-700">
          <div className="bg-ernesto-surface-800 rounded-lg p-4 text-center">
            <p className="text-xs text-ernesto-surface-400 mb-2">Memory Status</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ernesto-surface-200">Healthy</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen bg-ernesto-surface-950">
          {children}
        </div>
      </main>
    </div>
  );
}
