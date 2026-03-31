import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import '../../styles/admin/TeamManager.css';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  invite_code: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export function TeamManager() {
  const { session, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'operator' | 'manager' | 'viewer'>('operator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');

  useEffect(() => {
    loadEmployees();
    loadInvites();
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('ernesto_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setEmployees(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const { data, error: err } = await supabase
        .from('ernesto_invites')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setInvites(data || []);
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'invite',
            email: inviteEmail,
            role: inviteRole,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invite');
      }

      setInviteEmail('');
      setInviteRole('operator');
      setShowInviteDialog(false);
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (employeeId: string, newRole: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'update_employee',
            employee_id: employeeId,
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update employee');
      }

      await loadEmployees();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    }
  };

  const handleDeactivate = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'deactivate',
            employee_id: employeeId,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to deactivate employee');
      }

      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate employee');
    }
  };

  if (isLoading) {
    return <div className="team-manager-loader">Loading team...</div>;
  }

  return (
    <div className="team-manager">
      <div className="team-header">
        <h2>Team Members</h2>
        <button
          className="team-invite-btn"
          onClick={() => setShowInviteDialog(true)}
        >
          Invite Employee
        </button>
      </div>

      {error && <div className="team-error">{error}</div>}

      {showInviteDialog && (
        <div className="team-dialog-overlay" onClick={() => setShowInviteDialog(false)}>
          <div className="team-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="team-dialog-header">
              <h3>Invite Employee</h3>
              <button
                className="team-dialog-close"
                onClick={() => setShowInviteDialog(false)}
              >
                x
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="team-dialog-form">
              <div className="form-group">
                <label htmlFor="inviteEmail">Email</label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="inviteRole">Role</label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as 'operator' | 'manager' | 'viewer'
                    )
                  }
                  disabled={isSubmitting}
                >
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="form-btn-secondary"
                  onClick={() => setShowInviteDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="form-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="team-section">
        <h3>Active Employees</h3>
        <div className="team-table-wrapper">
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className={!emp.is_active ? 'inactive' : ''}>
                  <td>{emp.full_name}</td>
                  <td>{emp.email}</td>
                  <td>
                    {editingId === emp.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="team-role-select"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="operator">Operator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`team-role-badge role-${emp.role}`}>
                        {emp.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`team-status-badge ${
                        emp.is_active ? 'active' : 'inactive'
                      }`}
                    >
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {emp.last_login
                      ? new Date(emp.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="team-actions">
                    {editingId === emp.id ? (
                      <>
                        <button
                          className="team-action-btn save"
                          onClick={() =>
                            handleUpdateRole(emp.id, editRole)
                          }
                        >
                          Save
                        </button>
                        <button
                          className="team-action-btn cancel"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="team-action-btn edit"
                          onClick={() => {
                            setEditingId(emp.id);
                            setEditRole(emp.role);
                          }}
                        >
                          Edit
                        </button>
                        {emp.is_active && (
                          <button
                            className="team-action-btn deactivate"
                            onClick={() => handleDeactivate(emp.id)}
                          >
                            Deactivate
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="team-section">
          <h3>Pending Invites</h3>
          <div className="team-table-wrapper">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Code</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>
                      <span className={`team-role-badge role-${inv.role}`}>
                        {inv.role}
                      </span>
                    </td>
                    <td className="team-code">
                      <code>{inv.invite_code.substring(0, 8)}...</code>
                    </td>
                    <td>
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
