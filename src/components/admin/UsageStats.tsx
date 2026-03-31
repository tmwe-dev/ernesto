import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/admin/UsageStats.css';

interface UsageStats {
  provider: string;
  total_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  success_count: number;
  error_count: number;
  avg_latency_ms?: number;
}

export function UsageStats() {
  const { session } = useAuth();
  const [usage, setUsage] = useState<UsageStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
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
            action: 'get_usage',
            user_id: session?.user?.id,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load usage stats');
      }

      setUsage(data.data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="usage-stats-loader">Loading usage statistics...</div>;
  }

  if (usage.length === 0) {
    return (
      <div className="usage-stats">
        <div className="usage-stats-empty">
          <p>No usage data available yet</p>
        </div>
      </div>
    );
  }

  const totalCost = usage.reduce((sum, u) => sum + u.total_cost_usd, 0);
  const totalCalls = usage.reduce((sum, u) => sum + u.total_calls, 0);
  const totalTokensIn = usage.reduce((sum, u) => sum + u.total_tokens_in, 0);
  const totalTokensOut = usage.reduce((sum, u) => sum + u.total_tokens_out, 0);

  const maxCost = Math.max(...usage.map((u) => u.total_cost_usd));

  return (
    <div className="usage-stats">
      {error && <div className="usage-stats-error">{error}</div>}

      <div className="usage-stats-summary">
        <div className="usage-stats-card">
          <h3>Total Cost (This Month)</h3>
          <p className="usage-stats-value">${totalCost.toFixed(2)}</p>
        </div>

        <div className="usage-stats-card">
          <h3>Total API Calls</h3>
          <p className="usage-stats-value">{totalCalls.toLocaleString()}</p>
        </div>

        <div className="usage-stats-card">
          <h3>Total Tokens In</h3>
          <p className="usage-stats-value">
            {Math.round(totalTokensIn / 1000)}K
          </p>
        </div>

        <div className="usage-stats-card">
          <h3>Total Tokens Out</h3>
          <p className="usage-stats-value">
            {Math.round(totalTokensOut / 1000)}K
          </p>
        </div>
      </div>

      <div className="usage-stats-section">
        <h2>Usage by Provider</h2>

        <div className="usage-stats-charts">
          {usage.map((stat) => (
            <div key={stat.provider} className="usage-stats-provider">
              <h3>{stat.provider.toUpperCase()}</h3>

              <div className="usage-stats-bar-group">
                <div className="usage-stats-bar-label">Cost</div>
                <div className="usage-stats-bar-container">
                  <div
                    className="usage-stats-bar"
                    style={{
                      width: `${
                        maxCost > 0
                          ? (stat.total_cost_usd / maxCost) * 100
                          : 0
                      }%`,
                    }}
                  >
                    <span className="usage-stats-bar-value">
                      ${stat.total_cost_usd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="usage-stats-grid">
                <div className="usage-stats-metric">
                  <label>API Calls</label>
                  <p>{stat.total_calls}</p>
                </div>

                <div className="usage-stats-metric">
                  <label>Success Rate</label>
                  <p>
                    {stat.total_calls > 0
                      ? (
                          (stat.success_count / stat.total_calls) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>

                <div className="usage-stats-metric">
                  <label>Tokens In</label>
                  <p>{stat.total_tokens_in.toLocaleString()}</p>
                </div>

                <div className="usage-stats-metric">
                  <label>Tokens Out</label>
                  <p>{stat.total_tokens_out.toLocaleString()}</p>
                </div>

                <div className="usage-stats-metric">
                  <label>Errors</label>
                  <p className={stat.error_count > 0 ? 'error' : ''}>
                    {stat.error_count}
                  </p>
                </div>

                {stat.avg_latency_ms && (
                  <div className="usage-stats-metric">
                    <label>Avg Latency</label>
                    <p>{stat.avg_latency_ms.toFixed(0)}ms</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
