import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/admin/ActivityLog.css';

interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  } | {
    full_name: string;
    email: string;
  }[];
}

export function ActivityLog() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadActivityLog();
  }, []);

  const loadActivityLog = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('ernesto_activity_log')
        .select(
          `
          id,
          user_id,
          action,
          details,
          ip_address,
          created_at,
          user:ernesto_profiles(full_name, email)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter) {
        query = query.ilike('action', `%${filter}%`);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity log');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e: React.FormEvent<HTMLInputElement>) => {
    setFilter(e.currentTarget.value);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadActivityLog();
  };

  if (isLoading) {
    return <div className="activity-log-loader">Loading activity log...</div>;
  }

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'login':
        return 'login';
      case 'register':
        return 'user-add';
      case 'create_invite':
        return 'mail';
      case 'update_employee':
        return 'edit';
      case 'deactivate_employee':
        return 'user-block';
      case 'save_api_key':
        return 'key';
      case 'delete_api_key':
        return 'trash';
      case 'test_key':
        return 'check';
      default:
        return 'activity';
    }
  };

  return (
    <div className="activity-log">
      <div className="activity-log-header">
        <h2>Activity Log</h2>

        <form onSubmit={handleFilterSubmit} className="activity-log-filter">
          <input
            type="text"
            value={filter}
            onChange={handleFilterChange}
            placeholder="Filter by action..."
            className="activity-log-search"
          />
          <button type="submit" className="activity-log-search-btn">
            Search
          </button>
        </form>
      </div>

      {error && <div className="activity-log-error">{error}</div>}

      {logs.length === 0 ? (
        <div className="activity-log-empty">
          <p>No activity found</p>
        </div>
      ) : (
        <div className="activity-log-table-wrapper">
          <table className="activity-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={`activity-${getActionIcon(log.action)}`}>
                  <td>
                    <time dateTime={log.created_at}>
                      {new Date(log.created_at).toLocaleString()}
                    </time>
                  </td>
                  <td>
                    <div className="activity-log-user">
                      <p className="activity-log-user-name">
                        {Array.isArray(log.user) && log.user.length > 0
                          ? log.user[0].full_name
                          : 'Unknown'}
                      </p>
                      <p className="activity-log-user-email">
                        {Array.isArray(log.user) && log.user.length > 0
                          ? log.user[0].email
                          : ''}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className={`activity-log-action action-${log.action}`}>
                      {log.action
                        .split('_')
                        .map(
                          (w) =>
                            w.charAt(0).toUpperCase() + w.slice(1)
                        )
                        .join(' ')}
                    </span>
                  </td>
                  <td>
                    {Object.keys(log.details).length > 0 ? (
                      <code className="activity-log-details">
                        {JSON.stringify(log.details, null, 2)}
                      </code>
                    ) : (
                      <span className="activity-log-no-details">-</span>
                    )}
                  </td>
                  <td>
                    {log.ip_address ? (
                      <code>{log.ip_address}</code>
                    ) : (
                      <span className="activity-log-no-ip">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
