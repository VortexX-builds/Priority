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

// Clamp velocity bar width to 0–100%
const velBarWidth = (v) => {
    const pct = Math.min((v / 2) * 100, 100);
    return `${pct}%`;
};

const PulseDashboard = () => {
    const [users, setUsers]     = useState([]);
    const [tasks, setTasks]     = useState([]);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    // Add-member form
    const [memberName, setMemberName] = useState('');
    const [memberRole, setMemberRole] = useState('MEMBER');
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError]   = useState('');
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
        } catch (err) {
            setError('Cannot reach the server. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
        } catch (err) {
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
            <h2 className="section-title">Pulse Dashboard</h2>

            {error && <div className="error-msg">{error}</div>}

            {/* Stats row */}
            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-value">{tasks.length}</div>
                    <div className="stat-label">Total Tasks</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value" style={{ color: 'var(--success-color)' }}>
                        {completedTasks.length}
                    </div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning-color)' }}>
                        {pendingTasks.length}
                    </div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value" style={{ color: 'var(--priority-high)' }}>
                        {stats ? stats.overdue : '—'}
                    </div>
                    <div className="stat-label">Overdue</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value" style={{ color: '#a78bfa' }}>
                        {users.length}
                    </div>
                    <div className="stat-label">Team Members</div>
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
                                const vel = user.avg_velocity || 1.0;
                                const color = velocityColor(vel);
                                const label = velocityLabel(vel);
                                return (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 600 }}>{user.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{user.role}</td>
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
