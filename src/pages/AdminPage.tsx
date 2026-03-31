import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TeamManager } from '../components/admin/TeamManager';
import { ApiKeyManager } from '../components/admin/ApiKeyManager';
import { UsageStats } from '../components/admin/UsageStats';
import { ActivityLog } from '../components/admin/ActivityLog';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import '../styles/AdminPage.css';

type AdminTab = 'team' | 'api-keys' | 'usage' | 'activity' | 'settings';

export function AdminPage() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('team');

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">ERNESTO Admin</h1>
          <p className="admin-subtitle">Manage team, API keys, and usage</p>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-info">
            <div className="admin-user-details">
              <p className="admin-user-name">{profile.full_name}</p>
              <p className="admin-user-role">{profile.role}</p>
            </div>
            <button className="admin-logout-btn" onClick={signOut}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team
        </button>
        <button
          className={`admin-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
          onClick={() => setActiveTab('api-keys')}
        >
          API Keys
        </button>
        <button
          className={`admin-tab ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          Usage
        </button>
        <button
          className={`admin-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'team' && <TeamManager />}
        {activeTab === 'api-keys' && <ApiKeyManager />}
        {activeTab === 'usage' && <UsageStats />}
        {activeTab === 'activity' && <ActivityLog />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
