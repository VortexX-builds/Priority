import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from './TaskForm';
import { fetchTasks, completeTask, deleteTask, deleteTasksBulk, updateTask } from '../api';

const getPriorityTier = (score) => {
    if (score >= 3) return 'high';
    if (score >= 1) return 'med';
    return 'low';
};

const LABEL_COLORS = {
    Critical: '#ef4444',
    High:     '#f97316',
    Medium:   '#eab308',
    Low:      '#6b7280',
};

const formatDeadlineDays = (createdAt, deadlineDays) => {
    if (!deadlineDays) return 'No deadline';
    const created = createdAt ? new Date(createdAt) : new Date();
    const dueDate = new Date(created.getTime() + deadlineDays * 24 * 3600 * 1000);
    const diffDays = (dueDate - new Date()) / 86400000;
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays).toFixed(0)}d`;
    if (diffDays < 1) return 'Due today';
    return `Due in ${Math.ceil(diffDays)}d`;
};

const TaskRow = ({ task, onComplete, onDelete, onEdit, isSelected, onToggleSelect }) => {
    const [expanded, setExpanded] = useState(false);
    const [hours, setHours]       = useState('');
    const [saving, setSaving]     = useState(false);

    const [editing, setEditing]           = useState(false);
    const [editTitle, setEditTitle]       = useState(task.title);
    const [editDeadline, setEditDeadline] = useState(task.deadline_days ?? '');
    const [editEffort, setEditEffort]     = useState(task.effort);
    const [editImpact, setEditImpact]     = useState(task.impact);
    const [editWorkload, setEditWorkload] = useState(task.workload ?? 1);

    const score = task.priority_score ?? 0;
    const tier  = getPriorityTier(score);
    const label = task.priority_label || 'Low';

    const handleComplete = async () => {
        const h = parseFloat(hours);
        if (!h || h <= 0) { alert('Enter a valid number of hours.'); return; }
        setSaving(true);
        await onComplete(task.id, h);
        setSaving(false);
        setExpanded(false);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${task.title}"?`)) return;
        await onDelete(task.id);
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        await onEdit(task.id, {
            title: editTitle,
            deadline_days: editDeadline,
            effort: editEffort,
            impact: editImpact,
            workload: editWorkload,
        });
        setSaving(false);
        setEditing(false);
    };

    const handleCancelEdit = () => {
        setEditTitle(task.title);
        setEditDeadline(task.deadline_days ?? '');
        setEditEffort(task.effort);
        setEditImpact(task.impact);
        setEditWorkload(task.workload ?? 1);
        setEditing(false);
    };

    return (
        <div className="task-item" style={{ opacity: isSelected ? 0.85 : 1 }}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(task.id)}
                style={{ marginRight: '0.5rem', marginLeft: '0.75rem', accentColor: '#7c3aed', flexShrink: 0, cursor: 'pointer', alignSelf: 'center' }}
                title="Select task"
            />

            <div className={`priority-bar ${tier}`} />

            <div style={{ flex: 1 }}>
                <div className="task-body">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                        <span className="tag">🕐 {formatDeadlineDays(task.created_at, task.deadline_days)}</span>
                        <span className="tag">⚙️ {task.effort}h effort</span>
                        <span className="tag">⚡ Impact {task.impact}/10</span>
                        <span className="tag">📦 Workload {task.workload ?? 1}</span>
                    </div>
                </div>

                {expanded && (
                    <div className="complete-panel">
                        <label>Hours taken:</label>
                        <input
                            className="hours-input"
                            type="number"
                            min="0.5"
                            step="0.5"
                            placeholder={`~${(task.effort * 1.5).toFixed(1)}`}
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            autoFocus
                        />
                        <button className="btn-sm btn-success" onClick={handleComplete} disabled={saving}>
                            {saving ? '…' : 'Confirm Done'}
                        </button>
                        <button className="btn-sm btn-danger" onClick={() => setExpanded(false)}>
                            Cancel
                        </button>
                    </div>
                )}

                {editing && (
                    <div className="complete-panel" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        <input
                            className="hours-input"
                            style={{ width: '100%', marginBottom: '0.25rem' }}
                            type="text"
                            placeholder="Title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <input className="hours-input" style={{ width: '5rem' }} type="number" min="1" placeholder="Days due" title="Deadline days" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                            <input className="hours-input" style={{ width: '5rem' }} type="number" min="1" placeholder="Effort h" title="Effort (hours)" value={editEffort} onChange={(e) => setEditEffort(e.target.value)} />
                            <input className="hours-input" style={{ width: '5rem' }} type="number" min="1" max="10" placeholder="Impact" title="Impact /10" value={editImpact} onChange={(e) => setEditImpact(e.target.value)} />
                            <input className="hours-input" style={{ width: '5rem' }} type="number" min="0.1" step="0.1" placeholder="Workload" title="Workload" value={editWorkload} onChange={(e) => setEditWorkload(e.target.value)} />
                        </div>
                        <button className="btn-sm btn-success" onClick={handleSaveEdit} disabled={saving}>
                            {saving ? '…' : 'Save'}
                        </button>
                        <button className="btn-sm btn-danger" onClick={handleCancelEdit}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="task-side">
                <div>
                    <div className="score-num">{score.toFixed(2)}</div>
                    <div className="score-label">score</div>
                    <div style={{
                        marginTop: '0.25rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: LABEL_COLORS[label] || '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                    }}>{label}</div>
                </div>
                <div className="task-btns">
                    {!expanded && !editing && (
                        <button className="btn-sm btn-success" onClick={() => setExpanded(true)}>
                            Done ✓
                        </button>
                    )}
                    {!expanded && !editing && (
                        <button
                            className="btn-sm"
                            style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #2563eb' }}
                            onClick={() => setEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                    {!editing && (
                        <button className="btn-sm btn-danger" onClick={handleDelete}>
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const FocusMode = ({ task, onExit, onComplete }) => {
    const [hours, setHours] = useState('');
    const [saving, setSaving] = useState(false);
    const focusScore = task.priority_score ?? 0;
    const label = task.priority_label || 'Low';

    const handleComplete = async () => {
        const h = parseFloat(hours);
        if (!h || h <= 0) { alert('Enter a valid number of hours.'); return; }
        setSaving(true);
        await onComplete(task.id, h);
        setSaving(false);
        onExit();
    };

    return (
        <div className="focus-mode">
            <div className="focus-card">
                <div className="focus-score">{focusScore.toFixed(2)}</div>
                <div className="focus-score-label">Priority Score</div>
                <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: LABEL_COLORS[label] || '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.5rem'
                }}>{label}</div>

                <div className="focus-title">{task.title}</div>
                <div className="focus-meta">
                    {formatDeadlineDays(task.created_at, task.deadline_days)}<br />
                    ⚙️ {task.effort}h effort &nbsp;•&nbsp; ⚡ Impact {task.impact}/10 &nbsp;•&nbsp; 📦 Workload {task.workload ?? 1}
                </div>

                <div className="focus-complete-row">
                    <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder={`hrs (~${(task.effort * 1.5).toFixed(1)})`}
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                    />
                    <button
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.7rem 1.4rem' }}
                        onClick={handleComplete}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Mark Complete'}
                    </button>
                </div>
            </div>
            <button className="focus-exit" onClick={onExit}>← Exit Focus Mode</button>
        </div>
    );
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const SmartQueue = () => {
    const [tasks, setTasks]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [focusMode, setFocusMode] = useState(false);
    const [selected, setSelected]   = useState(new Set());
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [page, setPage]             = useState(1);
    const [pageSize, setPageSize]     = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadTasks = useCallback(async (pg, ps) => {
        try {
            const data = await fetchTasks({ page: pg, pageSize: ps });
            setTasks(data.tasks);
            setTotalCount(data.total);
            setTotalPages(data.totalPages);
            setSelected(new Set());
            setError('');
        } catch {
            setError('Cannot reach the server. Make sure the backend is running on port 3001.');
        } finally {
            setLoading(false);
        }
    }, []);

    const pageRef     = React.useRef(page);
    const pageSizeRef = React.useRef(pageSize);
    pageRef.current     = page;
    pageSizeRef.current = pageSize;

    useEffect(() => {
        loadTasks(page, pageSize);
        const interval = setInterval(() => loadTasks(pageRef.current, pageSizeRef.current), 60000);
        return () => clearInterval(interval);
    }, [loadTasks]); // eslint-disable-line react-hooks/exhaustive-deps

    const goToPage = (pg) => {
        const clamped = Math.max(1, Math.min(pg, totalPages));
        setPage(clamped);
        loadTasks(clamped, pageSize);
    };

    const handlePageSizeChange = (ps) => {
        setPageSize(ps);
        setPage(1);
        loadTasks(1, ps);
    };

    const handleComplete = async (taskId, hoursTaken) => {
        try {
            await completeTask(taskId, hoursTaken);
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to complete task.');
        }
    };

    const handleDelete = async (taskId) => {
        try {
            await deleteTask(taskId);
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to delete task.');
        }
    };

    const handleEdit = async (taskId, fields) => {
        try {
            await updateTask(taskId, fields);
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to update task.');
        }
    };

    const handleToggleSelect = (taskId) => {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(taskId) ? s.delete(taskId) : s.add(taskId);
            return s;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelected(new Set(tasks.map(t => t.id)));
        } else {
            setSelected(new Set());
        }
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`Delete ${selected.size} task(s)?`)) return;
        try {
            await deleteTasksBulk([...selected]);
            setSelected(new Set());
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to delete selected tasks.');
        }
    };

    const topTask    = tasks[0];
    const allSelected = tasks.length > 0 && selected.size === tasks.length;
    const start      = (page - 1) * pageSize + 1;
    const end        = Math.min(page * pageSize, totalCount);

    const criticalCount = tasks.filter(t => t.priority_label === 'Critical').length;
    const highCount     = tasks.filter(t => t.priority_label === 'High').length;

    return (
        <>
            {focusMode && topTask && (
                <FocusMode
                    task={topTask}
                    onExit={() => setFocusMode(false)}
                    onComplete={handleComplete}
                />
            )}

            {/* Drawer overlay */}
            <div
                className={`task-drawer-overlay${drawerOpen ? ' open' : ''}`}
                onClick={() => setDrawerOpen(false)}
            />

            {/* Task drawer */}
            <aside className={`task-drawer${drawerOpen ? ' open' : ''}`}>
                <div className="task-drawer-header">
                    <span className="task-drawer-title">New Task</span>
                    <button
                        className="task-drawer-close"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Close drawer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div className="task-drawer-body">
                    <TaskForm onTaskAdded={() => {
                        setPage(1);
                        loadTasks(1, pageSize);
                        setDrawerOpen(false);
                    }} />
                </div>
            </aside>

            {/* Main queue page */}
            <div className="queue-page">
                {/* Top bar */}
                <div className="page-topbar">
                    <div className="page-topbar-left">
                        <h1 className="page-title">Smart Queue</h1>
                        <p className="page-subtitle">Tasks ranked by AI priority score · auto-refreshes every 60s</p>
                    </div>
                    <div className="page-topbar-right">
                        {tasks.length > 0 && (
                            <button className="btn-ghost" onClick={() => setFocusMode(true)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                Focus Mode
                            </button>
                        )}
                        <button className="btn-primary btn-add-task" onClick={() => setDrawerOpen(true)}>
                            + Add Task
                        </button>
                    </div>
                </div>

                {/* Mini stats strip */}
                <div className="queue-stats-row">
                    <div className="queue-stat">
                        <span className="queue-stat-value">{totalCount}</span>
                        <span className="queue-stat-label">Pending</span>
                    </div>
                    <div className="queue-stat">
                        <span className="queue-stat-value" style={{ color: 'var(--red)' }}>{criticalCount}</span>
                        <span className="queue-stat-label">Critical</span>
                    </div>
                    <div className="queue-stat">
                        <span className="queue-stat-value" style={{ color: 'var(--amber)' }}>{highCount}</span>
                        <span className="queue-stat-label">High Priority</span>
                    </div>
                    <div className="queue-stat">
                        <span className="queue-stat-value" style={{ color: 'var(--violet)' }}>{selected.size}</span>
                        <span className="queue-stat-label">Selected</span>
                    </div>
                </div>

                {/* Bulk action bar */}
                {selected.size > 0 && (
                    <div className="bulk-action-bar">
                        <span>{selected.size} task{selected.size !== 1 ? 's' : ''} selected</span>
                        <button className="btn-sm btn-danger" onClick={handleDeleteSelected}>
                            Delete Selected
                        </button>
                    </div>
                )}

                {error && <div className="error-msg">{error}</div>}

                {loading ? (
                    <div className="loading">Engine is scoring tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '2.5rem' }}>🎉</div>
                        <h3 style={{ marginTop: '0.8rem' }}>All clear!</h3>
                        <p>No pending tasks. Hit <strong>+ Add Task</strong> to get started.</p>
                    </div>
                ) : (
                    <>
                        {/* List header */}
                        <div className="task-list-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    title="Select all"
                                    style={{ accentColor: '#7c3aed', cursor: 'pointer', width: '1rem', height: '1rem' }}
                                />
                                <span className="task-count-badge">{totalCount} tasks</span>
                            </div>
                        </div>

                        <div className="task-list">
                            {tasks.map(task => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    onComplete={handleComplete}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    isSelected={selected.has(task.id)}
                                    onToggleSelect={handleToggleSelect}
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <div className="pagination-btns">
                                    <button
                                        className="btn-page"
                                        onClick={() => goToPage(page - 1)}
                                        disabled={page === 1}
                                    >← Prev</button>

                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-3)', whiteSpace: 'nowrap', padding: '0 0.4rem' }}>
                                        Page <strong style={{ color: 'var(--text-1)' }}>{page}</strong> of <strong style={{ color: 'var(--text-1)' }}>{totalPages}</strong>
                                        &nbsp;·&nbsp;
                                        <span style={{ color: 'var(--violet)' }}>{start}–{end}</span> of {totalCount}
                                    </span>

                                    <button
                                        className="btn-page"
                                        onClick={() => goToPage(page + 1)}
                                        disabled={page === totalPages}
                                    >Next →</button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Per page:</span>
                                    {PAGE_SIZE_OPTIONS.map(ps => (
                                        <button
                                            key={ps}
                                            className={`btn-page${pageSize === ps ? ' active' : ''}`}
                                            onClick={() => handlePageSizeChange(ps)}
                                        >{ps}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default SmartQueue;
