import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/admin/ApiKeyManager.css';

interface ApiKey {
  id: string;
  provider: string;
  display_name: string;
  key_hint: string;
  is_active: boolean;
  model_default?: string;
  rate_limit_rpm: number;
  monthly_budget_usd?: number;
  usage_this_month: number;
  budget_remaining?: number;
  budget_percent: number;
  last_used_at?: string;
  created_at: string;
}

const PROVIDERS = [
  'anthropic',
  'gemini',
  'openai',
  'grok',
  'qwen',
  'elevenlabs',
  'lovable',
];

export function ApiKeyManager() {
  const { session } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [modelDefault, setModelDefault] = useState('');
  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-vault`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'list_keys',
            user_id: session?.user?.id,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load API keys');
      }

      setKeys(data.data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!selectedProvider || !apiKey || !displayName) {
        setError('Provider, API key, and display name are required');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-vault`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'save_key',
            user_id: session?.user?.id,
            provider: selectedProvider,
            api_key: apiKey,
            display_name: displayName,
            model_default: modelDefault || null,
            rate_limit_rpm: rateLimitRpm,
            monthly_budget_usd: monthlyBudget ? parseFloat(monthlyBudget) : null,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save API key');
      }

      setSelectedProvider('');
      setApiKey('');
      setDisplayName('');
      setModelDefault('');
      setRateLimitRpm(60);
      setMonthlyBudget('');
      setShowAddDialog(false);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestKey = async (keyId: string) => {
    try {
      setTestingKeyId(keyId);
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-vault`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'test_key',
            user_id: session?.user?.id,
            key_id: keyId,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.data.valid) {
        alert('API key is valid');
      } else {
        alert('API key test failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-vault`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'delete_key',
            user_id: session?.user?.id,
            key_id: keyId,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete API key');
      }

      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  if (isLoading) {
    return <div className="api-key-loader">Loading API keys...</div>;
  }

  const activeKeys = keys.filter((k) => k.is_active);
  const inactiveKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="api-key-manager">
      <div className="api-key-header">
        <h2>API Key Vault</h2>
        <button
          className="api-key-add-btn"
          onClick={() => setShowAddDialog(true)}
        >
          Add API Key
        </button>
      </div>

      {error && <div className="api-key-error">{error}</div>}

      {showAddDialog && (
        <div
          className="api-key-dialog-overlay"
          onClick={() => setShowAddDialog(false)}
        >
          <div
            className="api-key-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="api-key-dialog-header">
              <h3>Add API Key</h3>
              <button
                className="api-key-dialog-close"
                onClick={() => setShowAddDialog(false)}
              >
                x
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="api-key-dialog-form">
              <div className="form-group">
                <label htmlFor="provider">Provider</label>
                <select
                  id="provider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select provider...</option>
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Production Key"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here"
                  required
                  disabled={isSubmitting}
                />
                <small>Your key is encrypted before storage</small>
              </div>

              <div className="form-group">
                <label htmlFor="modelDefault">Default Model (optional)</label>
                <input
                  id="modelDefault"
                  type="text"
                  value={modelDefault}
                  onChange={(e) => setModelDefault(e.target.value)}
                  placeholder="e.g., claude-3-opus"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rateLimitRpm">Rate Limit (RPM)</label>
                  <input
                    id="rateLimitRpm"
                    type="number"
                    value={rateLimitRpm}
                    onChange={(e) => setRateLimitRpm(parseInt(e.target.value))}
                    min="1"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="monthlyBudget">Monthly Budget (USD)</label>
                  <input
                    id="monthlyBudget"
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="form-btn-secondary"
                  onClick={() => setShowAddDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="form-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="api-key-section">
        <h3>Active Keys</h3>
        {activeKeys.length === 0 ? (
          <p className="api-key-empty">No active API keys. Add one to get started.</p>
        ) : (
          <div className="api-key-cards">
            {activeKeys.map((key) => (
              <div key={key.id} className="api-key-card">
                <div className="api-key-card-header">
                  <h4>{key.provider.toUpperCase()}</h4>
                  <span className="api-key-status-badge active">Active</span>
                </div>

                <div className="api-key-card-content">
                  <div className="api-key-field">
                    <label>Display Name</label>
                    <p>{key.display_name}</p>
                  </div>

                  <div className="api-key-field">
                    <label>Key Hint</label>
                    <code>{key.key_hint}</code>
                  </div>

                  {key.model_default && (
                    <div className="api-key-field">
                      <label>Default Model</label>
                      <p>{key.model_default}</p>
                    </div>
                  )}

                  <div className="api-key-field">
                    <label>Rate Limit</label>
                    <p>{key.rate_limit_rpm} RPM</p>
                  </div>

                  {key.monthly_budget_usd && (
                    <div className="api-key-field">
                      <label>Budget Usage</label>
                      <div className="api-key-budget">
                        <div className="api-key-budget-bar">
                          <div
                            className="api-key-budget-used"
                            style={{
                              width: `${Math.min(key.budget_percent, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p>
                          ${key.usage_this_month.toFixed(2)} / $
                          {key.monthly_budget_usd.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  {key.last_used_at && (
                    <div className="api-key-field">
                      <label>Last Used</label>
                      <p>{new Date(key.last_used_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="api-key-card-actions">
                  <button
                    className="api-key-action-btn test"
                    onClick={() => handleTestKey(key.id)}
                    disabled={testingKeyId === key.id}
                  >
                    {testingKeyId === key.id ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    className="api-key-action-btn delete"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inactiveKeys.length > 0 && (
        <div className="api-key-section">
          <h3>Inactive Keys</h3>
          <div className="api-key-cards">
            {inactiveKeys.map((key) => (
              <div key={key.id} className="api-key-card inactive">
                <div className="api-key-card-header">
                  <h4>{key.provider.toUpperCase()}</h4>
                  <span className="api-key-status-badge inactive">Inactive</span>
                </div>

                <div className="api-key-card-content">
                  <div className="api-key-field">
                    <label>Display Name</label>
                    <p>{key.display_name}</p>
                  </div>

                  <div className="api-key-field">
                    <label>Key Hint</label>
                    <code>{key.key_hint}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
