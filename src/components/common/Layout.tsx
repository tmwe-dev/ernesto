import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-100">
      {children}
    </div>
  );
};
