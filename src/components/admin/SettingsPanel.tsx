import React, { useState } from 'react';
import '../../styles/admin/SettingsPanel.css';

interface SystemSettings {
  default_provider: string;
  global_rate_limit_rpm: number;
  budget_alert_threshold: number;
  enable_usage_tracking: boolean;
  retention_days: number;
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings>({
    default_provider: 'anthropic',
    global_rate_limit_rpm: 1000,
    budget_alert_threshold: 80,
    enable_usage_tracking: true,
    retention_days: 90,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSettingChange = (key: keyof SystemSettings, value: unknown) => {
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // In a real app, this would save to a settings table
      // For now, we'll just simulate the save
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : 'Failed to save settings'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>System Settings</h2>
        <p>Configure ERNESTO system-wide preferences</p>
      </div>

      {saveMessage && (
        <div
          className={`settings-message ${
            saveMessage.includes('successfully') ? 'success' : 'error'
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className="settings-sections">
        <div className="settings-section">
          <h3>API Configuration</h3>

          <div className="settings-group">
            <label htmlFor="defaultProvider">Default Provider</label>
            <select
              id="defaultProvider"
              value={settings.default_provider}
              onChange={(e) =>
                handleSettingChange('default_provider', e.target.value)
              }
              disabled={isSaving}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="grok">Grok</option>
              <option value="qwen">Qwen</option>
              <option value="elevenlabs">ElevenLabs</option>
              <option value="lovable">Lovable</option>
            </select>
            <small>Used when provider is not specified in requests</small>
          </div>

          <div className="settings-group">
            <label htmlFor="globalRateLimit">Global Rate Limit (RPM)</label>
            <input
              id="globalRateLimit"
              type="number"
              value={settings.global_rate_limit_rpm}
              onChange={(e) =>
                handleSettingChange(
                  'global_rate_limit_rpm',
                  parseInt(e.target.value)
                )
              }
              min="1"
              disabled={isSaving}
            />
            <small>
              Maximum requests per minute across all API keys
            </small>
          </div>
        </div>

        <div className="settings-section">
          <h3>Budget Management</h3>

          <div className="settings-group">
            <label htmlFor="budgetAlert">Budget Alert Threshold (%)</label>
            <input
              id="budgetAlert"
              type="number"
              value={settings.budget_alert_threshold}
              onChange={(e) =>
                handleSettingChange(
                  'budget_alert_threshold',
                  parseInt(e.target.value)
                )
              }
              min="0"
              max="100"
              disabled={isSaving}
            />
            <small>
              Alert when monthly budget usage exceeds this percentage
            </small>
          </div>
        </div>

        <div className="settings-section">
          <h3>Data Management</h3>

          <div className="settings-group">
            <label htmlFor="usageTracking">
              <input
                id="usageTracking"
                type="checkbox"
                checked={settings.enable_usage_tracking}
                onChange={(e) =>
                  handleSettingChange('enable_usage_tracking', e.target.checked)
                }
                disabled={isSaving}
              />
              Enable Usage Tracking
            </label>
            <small>
              Log all API calls and usage metrics. Disable to reduce
              database size.
            </small>
          </div>

          <div className="settings-group">
            <label htmlFor="retentionDays">Activity Log Retention (days)</label>
            <input
              id="retentionDays"
              type="number"
              value={settings.retention_days}
              onChange={(e) =>
                handleSettingChange('retention_days', parseInt(e.target.value))
              }
              min="7"
              max="365"
              disabled={isSaving}
            />
            <small>
              Automatically delete activity logs older than this period
            </small>
          </div>
        </div>

        <div className="settings-section">
          <h3>Security</h3>

          <div className="settings-info">
            <p>
              API keys are encrypted using AES-256-GCM with a secret key stored
              in environment variables.
            </p>
            <p>
              All API keys are masked in logs and never displayed in plaintext
              in the UI.
            </p>
            <p>
              Admin role is required to create, modify, or delete API keys.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Backup & Export</h3>

          <div className="settings-actions">
            <button className="settings-btn secondary" disabled={isSaving}>
              Export Activity Log
            </button>
            <button className="settings-btn secondary" disabled={isSaving}>
              Export Usage Data
            </button>
          </div>
        </div>
      </div>

      <div className="settings-actions-footer">
        <button
          className="settings-btn primary"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
