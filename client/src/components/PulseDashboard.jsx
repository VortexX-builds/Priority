import React, { useState, useEffect, useCallback } from 'react';
import { fetchUsers, fetchTasks, fetchStats, createUser } from '../api';

const velocityColor = (v) => {
    if (v > 1.2)  return 'var(--priority-high)';
    if (v < 0.85) return 'var(--accent-color)';
    return 'var(--success-color)';
};

const velocityLabel = (v) => {
    if (v > 1.2)  return 'Running slow';
    if (v < 0.85) return 'High efficiency';
    return 'On track';
};

const velBarWidth = (v) => `${Math.min((v / 2) * 100, 100)}%`;

const PulseDashboard = () => {
    const [users, setUsers]     = useState([]);
    const [tasks, setTasks]     = useState([]);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const [memberName, setMemberName]       = useState('');
    const [memberRole, setMemberRole]       = useState('MEMBER');
    const [addingMember, setAddingMember]   = useState(false);
    const [memberError, setMemberError]     = useState('');
    const [memberSuccess, setMemberSuccess] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [usersData, tasksData, statsData] = await Promise.all([
                fetchUsers(),
                fetchTasks(),
                fetchStats(),
            ]);
            setUsers(usersData);
            setTasks(tasksData.tasks || []);
            setStats(statsData);
            setError('');
        } catch {
            setError('Cannot reach the server. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        setMemberError('');
        setMemberSuccess(false);
        if (!memberName.trim()) { setMemberError('Name is required.'); return; }
        setAddingMember(true);
        try {
            await createUser({ name: memberName.trim(), role: memberRole });
            setMemberName('');
            setMemberRole('MEMBER');
            setMemberSuccess(true);
            setTimeout(() => setMemberSuccess(false), 2500);
            await loadData();
        } catch {
            setMemberError('Failed to add member.');
        } finally {
            setAddingMember(false);
        }
    };

    if (loading) return <div className="loading">Loading dashboard…</div>;

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const pendingTasks   = tasks.filter(t => t.status !== 'COMPLETED');

    return (
        <div>
            {/* Page top bar */}
            <div className="page-topbar">
                <div className="page-topbar-left">
                    <h1 className="page-title">Pulse Dashboard</h1>
                    <p className="page-subtitle">Team performance and task analytics</p>
                </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            {/* Stats row — icon-based cards */}
            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--indigo)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                    </div>
                    <div className="stat-body">
                        <div className="stat-value">{tasks.length}</div>
                        <div className="stat-label">Total Tasks</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div className="stat-body">
                        <div className="stat-value green">{completedTasks.length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div className="stat-body">
                        <div className="stat-value amber">{pendingTasks.length}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(244,63,94,0.12)', color: 'var(--red)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <div className="stat-body">
                        <div className="stat-value red">{stats ? stats.overdue : '—'}</div>
                        <div className="stat-label">Overdue</div>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon-box" style={{ background: 'rgba(168,85,247,0.12)', color: 'var(--purple)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div className="stat-body">
                        <div className="stat-value purple">{users.length}</div>
                        <div className="stat-label">Team Members</div>
                    </div>
                </div>
            </div>

            {/* Two-column bottom section */}
            <div className="dash-grid">
                {/* Add team member */}
                <div className="card">
                    <h3 className="section-title">Add Team Member</h3>
                    {memberError   && <div className="error-msg">{memberError}</div>}
                    {memberSuccess && (
                        <div style={{ color: 'var(--success-color)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>
                            ✓ Member added!
                        </div>
                    )}
                    <form onSubmit={handleAddMember} className="add-member-form">
                        <div className="form-group">
                            <label htmlFor="member-name">Full Name</label>
                            <input
                                id="member-name"
                                className="form-control"
                                value={memberName}
                                onChange={(e) => setMemberName(e.target.value)}
                                placeholder="e.g. Alex Johnson"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="member-role">Role</label>
                            <select
                                id="member-role"
                                className="form-control"
                                value={memberRole}
                                onChange={(e) => setMemberRole(e.target.value)}
                            >
                                <option value="MEMBER">Member</option>
                                <option value="MANAGER">Manager</option>
                                <option value="LEAD">Lead</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={addingMember}
                            style={{ width: 'auto', padding: '0.7rem 1.2rem', alignSelf: 'flex-end', marginBottom: 0 }}
                        >
                            {addingMember ? 'Adding…' : '+ Add'}
                        </button>
                    </form>
                </div>

                {/* Recently completed */}
                <div className="card">
                    <h3 className="section-title">Recently Completed</h3>
                    {completedTasks.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            No completed tasks yet.
                        </p>
                    ) : (
                        <div className="completed-items">
                            {completedTasks.map(t => (
                                <div key={t.id} className="completed-item">
                                    <span className="item-title">{t.title}</span>
                                    <span className="item-meta">Done ✓</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Team velocity table */}
            <div className="card" style={{ marginTop: 0 }}>
                <h3 className="section-title">Team Velocity Tracker</h3>
                {users.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        No team members yet. Add one above.
                    </p>
                ) : (
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Velocity</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const vel   = user.avg_velocity || 1.0;
                                const color = velocityColor(vel);
                                const label = velocityLabel(vel);
                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="member-avatar">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span style={{ fontWeight: 600 }}>{user.name}</span>
                                            </div>
                                        </td>
                                        <td><span className="role-badge">{user.role}</span></td>
                                        <td>
                                            <div className="vel-bar-wrap">
                                                <div className="vel-bar-bg">
                                                    <div
                                                        className="vel-bar-fill"
                                                        style={{ width: velBarWidth(vel), background: color }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>
                                                    {vel.toFixed(2)}x
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>{label}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PulseDashboard;
