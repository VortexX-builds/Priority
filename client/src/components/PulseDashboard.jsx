import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCompletedTasks, fetchStats, deleteTask } from '../api';

const velColor = (v) => {
    if (v >= 1.0) return '#10b981';
    if (v >= 0.7) return '#f59e0b';
    return '#ef4444';
};

const velLabel = (v) => {
    if (v >= 1.0) return 'Fast';
    if (v >= 0.7) return 'On Track';
    return 'Slow';
};

const VelocityBar = ({ velocityScore }) => {
    const capped = Math.min(Math.max(velocityScore / 3.0, 0.015), 1.0);
    const color  = velColor(velocityScore);

    const glowColor = color === '#10b981'
        ? 'rgba(16,185,129,0.45)'
        : color === '#f59e0b'
            ? 'rgba(245,158,11,0.45)'
            : 'rgba(239,68,68,0.45)';

    const gradientLight = color === '#10b981'
        ? '#6ee7b7'
        : color === '#f59e0b'
            ? '#fcd34d'
            : '#fca5a5';

    return (
        <div style={{
            width: '100%',
            height: '10px',
            borderRadius: '5px',
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
            position: 'relative',
        }}>
            <div style={{
                height: '100%',
                width: `${capped * 100}%`,
                borderRadius: '5px',
                background: `linear-gradient(90deg, ${color} 0%, ${gradientLight} 100%)`,
                boxShadow: `0 0 10px ${glowColor}, 0 0 4px ${glowColor}`,
                transformOrigin: 'left center',
                animation: 'vel-fill 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    transform: 'translateX(-100%)',
                    animation: 'vel-shimmer 1.1s ease-out 0.9s 1 forwards',
                }} />
            </div>
        </div>
    );
};

const PulseDashboard = () => {
    const [completedTasks,      setCompletedTasks]      = useState([]);
    const [stats,               setStats]               = useState(null);
    const [loading,             setLoading]             = useState(true);
    const [error,               setError]               = useState('');
    const [reloadKey,           setReloadKey]           = useState(0);
    const [completedPage,       setCompletedPage]       = useState(1);
    const [completedTotalPages, setCompletedTotalPages] = useState(1);
    const [completedTotal,      setCompletedTotal]      = useState(0);
    const [searchInput,         setSearchInput]         = useState('');
    const [search,              setSearch]              = useState('');
    const debounceRef = useRef(null);

    const loadData = useCallback(async () => {
        try {
            const [tasksData, statsData] = await Promise.all([
                fetchCompletedTasks({ page: completedPage, pageSize: 5, search }),
                fetchStats(),
            ]);
            setCompletedTasks(tasksData.tasks);
            setCompletedTotalPages(tasksData.totalPages);
            setCompletedTotal(tasksData.total);
            setStats(statsData);
            setError('');
            setReloadKey(k => k + 1);
        } catch (err) {
            if (err instanceof TypeError) {
                setError('Cannot reach the server. Make sure the backend is running.');
            } else {
                setError(`Server error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [completedPage, search]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteCompleted = async (taskId) => {
        if (!window.confirm('Delete this completed task? This cannot be undone.')) return;
        try {
            await deleteTask(taskId);
            if (completedTasks.length === 1 && completedPage > 1) {
                setCompletedPage(p => p - 1);
            } else {
                await loadData();
            }
        } catch (err) {
            setError(`Failed to delete task: ${err.message}`);
        }
    };

    const handleSearchInput = (e) => {
        const val = e.target.value;
        setSearchInput(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setCompletedPage(1);
            setSearch(val);
        }, 300);
    };

    if (loading) return <div className="loading">Loading dashboard…</div>;

    const totalTasks     = stats?.total     ?? 0;
    const completedCount = stats?.completed ?? 0;
    const pendingCount   = stats?.pending   ?? 0;
    const overdueCount   = stats?.overdue   ?? 0;

    return (
        <div>
            <style>{`
                @keyframes vel-fill {
                    0%   { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                }
                @keyframes vel-shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>

            <div className="page-topbar">
                <div className="page-topbar-left">
                    <h1 className="page-title">Pulse Dashboard</h1>
                    <p className="page-subtitle">Task analytics and velocity tracker</p>
                </div>
            </div>

            {error && (
                <div className="error-msg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{error}</span>
                    <button onClick={loadData} style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', cursor: 'pointer', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', color: 'inherit', fontSize: '0.8rem' }}>
                        Retry
                    </button>
                </div>
            )}

            {/* Stats row */}
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
                        <div className="stat-value">{totalTasks}</div>
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
                        <div className="stat-value green">{completedCount}</div>
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
                        <div className="stat-value amber">{pendingCount}</div>
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
                        <div className="stat-value red">{overdueCount}</div>
                        <div className="stat-label">Overdue</div>
                    </div>
                </div>
            </div>

            {/* Task Velocity Tracker */}
            <div className="card" style={{ marginTop: 0 }}>
                <h3 className="section-title">Task Velocity Tracker</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3, #71717a)', marginBottom: '1.1rem', marginTop: '-0.4rem' }}>
                    Velocity = (effort × 1.5) ÷ hours taken &nbsp;·&nbsp; 1.0x = on time &nbsp;·&nbsp; bar capped at 3.0x
                </p>

                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: '1.1rem' }}>
                    <svg
                        width="15" height="15"
                        viewBox="0 0 24 24" fill="none" stroke="var(--text-3, #71717a)"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search completed tasks…"
                        value={searchInput}
                        onChange={handleSearchInput}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                            background: 'var(--surface-2, #1e1e2e)',
                            border: '1px solid var(--border-color, #2e2e3e)',
                            borderRadius: '6px',
                            color: 'var(--text-1)',
                            fontSize: '0.85rem',
                            outline: 'none',
                        }}
                    />
                </div>

                {completedTasks.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {search
                            ? `No completed tasks match "${search}".`
                            : 'No completed tasks yet. Mark tasks done in Smart Queue to see velocity data.'}
                    </p>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {completedTasks.map(t => {
                                const vel   = t.velocity_score != null ? t.velocity_score : null;
                                const color = vel != null ? velColor(vel) : 'var(--text-3)';
                                const label = vel != null ? velLabel(vel) : null;

                                return (
                                    <div key={`${t.id}-${reloadKey}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {/* Row: title + badges */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{
                                                fontSize: '0.88rem',
                                                fontWeight: 600,
                                                color: 'var(--text-1)',
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {t.title}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>
                                                    effort {t.effort}
                                                </span>
                                                {vel != null && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.15rem 0.55rem',
                                                        borderRadius: '999px',
                                                        background: `${color}18`,
                                                        border: `1px solid ${color}40`,
                                                        fontFamily: 'JetBrains Mono, monospace',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color,
                                                    }}>
                                                        {Math.min(vel, 3).toFixed(2)}x
                                                        <span style={{ fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 600 }}>{label}</span>
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteCompleted(t.id)}
                                                    title="Delete completed task"
                                                    aria-label="Delete completed task"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '1.55rem',
                                                        height: '1.55rem',
                                                        padding: 0,
                                                        borderRadius: '999px',
                                                        background: 'transparent',
                                                        border: '1px solid rgba(239,68,68,0.25)',
                                                        color: '#ef4444',
                                                        fontSize: '0.9rem',
                                                        lineHeight: 1,
                                                        cursor: 'pointer',
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        {/* Velocity bar */}
                                        {vel != null
                                            ? <VelocityBar velocityScore={vel} />
                                            : (
                                                <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                                                    No hours logged — velocity unavailable
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {completedTotalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.2rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-color, #2e2e3e)' }}>
                                <button
                                    className="btn-sm"
                                    onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                                    disabled={completedPage === 1}
                                    style={{ opacity: completedPage === 1 ? 0.4 : 1 }}
                                >
                                    ← Prev
                                </button>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                                    Page {completedPage} of {completedTotalPages}
                                    <span style={{ marginLeft: '0.4rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                                        ({completedTotal} total)
                                    </span>
                                </span>
                                <button
                                    className="btn-sm"
                                    onClick={() => setCompletedPage(p => Math.min(completedTotalPages, p + 1))}
                                    disabled={completedPage === completedTotalPages}
                                    style={{ opacity: completedPage === completedTotalPages ? 0.4 : 1 }}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PulseDashboard;
