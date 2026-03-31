import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext, useAuthState } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import './styles/global.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthState();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e27 0%, #0f1d3d 100%)',
          color: '#cbd5e0',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppNav() {
  const location = useLocation();
  const { signOut, profile } = useAuthState();

  if (location.pathname === '/login') return null;

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/import', label: 'Import Listini' },
    { path: '/kb', label: 'Knowledge Base' },
    { path: '/admin', label: 'Admin' },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '56px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: '18px', marginRight: '24px' }}>
          ERNESTO
        </span>
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: location.pathname === item.path ? '#22d3ee' : '#94a3b8',
              background: location.pathname === item.path ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
          {profile?.full_name || 'User'}
        </span>
        <button
          onClick={signOut}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

function App() {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      <AppNav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/import"
          element={
            <PrivateRoute>
              <ImportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/kb"
          element={
            <PrivateRoute>
              <KnowledgeBasePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
