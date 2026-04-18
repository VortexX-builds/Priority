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

    const [editing, setEditing]         = useState(false);
    const [editTitle, setEditTitle]     = useState(task.title);
    const [editDeadline, setEditDeadline] = useState(task.deadline_days ?? '');
    const [editEffort, setEditEffort]   = useState(task.effort);
    const [editImpact, setEditImpact]   = useState(task.impact);
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
                style={{ marginRight: '0.5rem', marginLeft: '0.1rem', accentColor: '#7c3aed', flexShrink: 0, cursor: 'pointer' }}
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

    const [page, setPage]           = useState(1);
    const [pageSize, setPageSize]   = useState(50);
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

    // Keep a ref to current page/pageSize so the interval always uses fresh values
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

    const topTask = tasks[0];
    const allSelected = tasks.length > 0 && selected.size === tasks.length;
    const start = (page - 1) * pageSize + 1;
    const end   = Math.min(page * pageSize, totalCount);

    return (
        <>
            {focusMode && topTask && (
                <FocusMode
                    task={topTask}
                    onExit={() => setFocusMode(false)}
                    onComplete={handleComplete}
                />
            )}

            <div className="queue-layout">
                <div className="card">
                    <h2 className="section-title">Log New Task</h2>
                    <TaskForm onTaskAdded={() => { setPage(1); loadTasks(1, pageSize); }} />
                </div>

                <div>
                    <div className="queue-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {tasks.length > 0 && (
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    title="Select all"
                                    style={{ accentColor: '#7c3aed', cursor: 'pointer', width: '1rem', height: '1rem' }}
                                />
                            )}
                            <h2 className="section-title" style={{ marginBottom: 0 }}>Smart Queue</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                            <span className="task-count-badge">{totalCount} pending</span>
                            {selected.size > 0 && (
                                <button
                                    className="btn-sm btn-danger"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                    onClick={handleDeleteSelected}
                                >
                                    Delete Selected ({selected.size})
                                </button>
                            )}
                            {tasks.length > 0 && (
                                <button
                                    id="focus-mode-btn"
                                    className="btn-primary"
                                    style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                                    onClick={() => setFocusMode(true)}
                                >
                                    Focus Mode
                                </button>
                            )}
                        </div>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    {loading ? (
                        <div className="loading">Engine is scoring tasks…</div>
                    ) : tasks.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: '2.5rem' }}>🎉</div>
                            <h3 style={{ marginTop: '0.8rem' }}>All clear!</h3>
                            <p>No pending tasks. Add a new one on the left.</p>
                        </div>
                    ) : (
                        <>
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
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.8rem 0.4rem', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.6rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <button
                                        className="btn-sm"
                                        style={{ background: '#1e1e2e', border: '1px solid #444', color: '#ccc', opacity: page === 1 ? 0.4 : 1 }}
                                        onClick={() => goToPage(page - 1)}
                                        disabled={page === 1}
                                    >← Prev</button>

                                    <span style={{ fontSize: '0.82rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                                        Page <strong style={{ color: '#e2e8f0' }}>{page}</strong> of <strong style={{ color: '#e2e8f0' }}>{totalPages}</strong>
                                        &nbsp;·&nbsp;
                                        <span style={{ color: '#7c3aed' }}>{start}–{end}</span> of {totalCount}
                                    </span>

                                    <button
                                        className="btn-sm"
                                        style={{ background: '#1e1e2e', border: '1px solid #444', color: '#ccc', opacity: page === totalPages ? 0.4 : 1 }}
                                        onClick={() => goToPage(page + 1)}
                                        disabled={page === totalPages}
                                    >Next →</button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#888' }}>Per page:</span>
                                    {PAGE_SIZE_OPTIONS.map(ps => (
                                        <button
                                            key={ps}
                                            className="btn-sm"
                                            style={{
                                                background: pageSize === ps ? '#7c3aed' : '#1e1e2e',
                                                border: `1px solid ${pageSize === ps ? '#7c3aed' : '#444'}`,
                                                color: pageSize === ps ? '#fff' : '#aaa',
                                                padding: '0.25rem 0.55rem',
                                                fontSize: '0.78rem'
                                            }}
                                            onClick={() => handlePageSizeChange(ps)}
                                        >{ps}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default SmartQueue;
