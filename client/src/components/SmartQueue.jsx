import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from './TaskForm';
import { fetchTasks, completeTask, deleteTask, deleteTasksBulk } from '../api';

const getPriorityTier = (score) => {
    if (score >= 3) return 'high';
    if (score >= 1) return 'med';
    return 'low';
};

const LABEL_COLORS = {
    Critical: '#dc2626',
    High:     '#ea580c',
    Medium:   '#ca8a04',
    Low:      '#71717a',
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

const getDaysRemaining = (createdAt, deadlineDays) => {
    if (!deadlineDays) return null;
    const created = createdAt ? new Date(createdAt) : new Date();
    const dueDate = new Date(created.getTime() + deadlineDays * 24 * 3600 * 1000);
    return (dueDate - new Date()) / 86400000;
};

const TaskRow = ({ task, isSelected, onToggleSelect }) => {
    const score = task.priority_score ?? 0;
    const tier  = getPriorityTier(score);
    const label = task.priority_label || 'Low';
    const color = LABEL_COLORS[label] || '#71717a';

    return (
        <div className="task-item" style={{ opacity: isSelected ? 0.85 : 1 }} onClick={() => onToggleSelect(task.id)}>
            <div className="task-checkbox-wrap">
                <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(task.id)}
                    onClick={(e) => e.stopPropagation()}
                    title="Select task"
                />
            </div>
            <div className={`priority-bar ${tier}`} />
            <div className="task-body">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                    <span className="tag">🕐 {formatDeadlineDays(task.created_at, task.deadline_days)}</span>
                    <span className="tag">⚙️ {task.effort} effort</span>
                    <span className="tag">⚡ Impact {task.impact}/10</span>
                    <span className="tag">📦 Workload {task.workload ?? 1}</span>
                </div>
            </div>
            <div className="task-side">
                <div className="score-num">{score.toFixed(2)}</div>
                <div className="score-label">score</div>
                <div
                    className="priority-label-badge"
                    style={{ color, background: `${color}18`, border: `1px solid ${color}33` }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const ConfirmModal = ({ count, onConfirm, onCancel }) => (
    <div className="confirm-overlay" onClick={onCancel}>
        <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
            </div>
            <div className="confirm-body">
                <h3 className="confirm-title">Delete {count} task{count !== 1 ? 's' : ''}?</h3>
                <p className="confirm-desc">This action cannot be undone.</p>
            </div>
            <div className="confirm-actions">
                <button className="btn-sm confirm-cancel" onClick={onCancel}>Cancel</button>
                <button className="btn-sm btn-danger" onClick={onConfirm}>Delete</button>
            </div>
        </div>
    </div>
);

const exportToCSV = (tasks) => {
    const headers = ['Task ID', 'Title', 'Deadline Days', 'Effort', 'Impact', 'Workload', 'Priority Score', 'Priority Label', 'Status'];
    const rows = tasks.map(t => [
        t.external_task_id || t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.deadline_days ?? '',
        t.effort ?? '',
        t.impact ?? '',
        t.workload ?? '',
        t.priority_score != null ? Number(t.priority_score).toFixed(4) : '',
        t.priority_label || '',
        t.status || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const SmartQueue = () => {
    const [tasks, setTasks]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [selected, setSelected]     = useState(new Set());
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editTask, setEditTask]     = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [alertDismissed, setAlertDismissed] = useState(false);
    const [hoursInput, setHoursInput] = useState('');

    const [activeFilter, setActiveFilter] = useState(null);

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

    const handleToggleSelect = (taskId) => {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(taskId) ? s.delete(taskId) : s.add(taskId);
            return s;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelected(new Set(displayedTasks.map(t => t.id)));
        } else {
            setSelected(new Set());
        }
    };

    const handleDeleteSelected = () => setDeleteModal(true);

    const confirmDelete = async () => {
        setDeleteModal(false);
        try {
            await deleteTasksBulk([...selected]);
            setSelected(new Set());
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to delete selected tasks.');
        }
    };

    const handleBulkDone = async () => {
        try {
            const hours = parseFloat(hoursInput) || 0;
            await Promise.all([...selected].map(id => completeTask(id, hours)));
            setSelected(new Set());
            setHoursInput('');
            await loadTasks(page, pageSize);
        } catch {
            setError('Failed to mark tasks as done.');
        }
    };

    const handleOpenEdit = () => {
        const taskId = [...selected][0];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setEditTask(task);
            setDrawerOpen(true);
        }
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setEditTask(null);
    };

    // Stats for the new bar
    const lowCount  = tasks.filter(t => t.priority_label === 'Low').length;
    const medCount  = tasks.filter(t => t.priority_label === 'Medium').length;
    const highCount = tasks.filter(t => t.priority_label === 'High' || t.priority_label === 'Critical').length;

    // Alert: tasks overdue or due within 2 days
    const overdueTasks = tasks.filter(t => {
        const d = getDaysRemaining(t.created_at, t.deadline_days);
        return d !== null && d < 0;
    });
    const approachingTasks = tasks.filter(t => {
        const d = getDaysRemaining(t.created_at, t.deadline_days);
        return d !== null && d >= 0 && d <= 2;
    });
    const hasAlerts = (overdueTasks.length > 0 || approachingTasks.length > 0) && !alertDismissed;

    const displayedTasks = activeFilter === 'low'
        ? tasks.filter(t => t.priority_label === 'Low')
        : activeFilter === 'medium'
        ? tasks.filter(t => t.priority_label === 'Medium')
        : activeFilter === 'high'
        ? tasks.filter(t => t.priority_label === 'High' || t.priority_label === 'Critical')
        : tasks;

    const toggleFilter = (key) => setActiveFilter(prev => prev === key ? null : key);

    const allSelected   = displayedTasks.length > 0 && displayedTasks.every(t => selected.has(t.id));
    const start         = (page - 1) * pageSize + 1;
    const end           = Math.min(page * pageSize, totalCount);

    return (
        <>
            {deleteModal && (
                <ConfirmModal
                    count={selected.size}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModal(false)}
                />
            )}

            <div
                className={`task-drawer-overlay${drawerOpen ? ' open' : ''}`}
                onClick={handleCloseDrawer}
            />

            <aside className={`task-drawer${drawerOpen ? ' open' : ''}`}>
                <div className="task-drawer-header">
                    <span className="task-drawer-title">{editTask ? 'Edit Task' : 'New Task'}</span>
                    <button
                        className="task-drawer-close"
                        onClick={handleCloseDrawer}
                        aria-label="Close drawer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div className="task-drawer-body">
                    <TaskForm
                        editTask={editTask}
                        onTaskAdded={() => {
                            setPage(1);
                            loadTasks(1, pageSize);
                            handleCloseDrawer();
                        }}
                    />
                </div>
            </aside>

            <div className="queue-page">
                {/* Top bar */}
                <div className="page-topbar">
                    <div className="page-topbar-left">
                        <h1 className="page-title">Smart Queue</h1>
                        <p className="page-subtitle">Tasks ranked by priority score · auto-refreshes every 60s</p>
                    </div>
                    <div className="page-topbar-right">
                        <button
                            className="btn-ghost"
                            onClick={() => exportToCSV(tasks)}
                            title="Export all tasks as CSV"
                        >
                            ↓ Export CSV
                        </button>
                        <button className="btn-primary btn-add-task" onClick={() => setDrawerOpen(true)}>
                            + Add Task
                        </button>
                    </div>
                </div>

                {/* Alert banners */}
                {hasAlerts && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {overdueTasks.length > 0 && (
                            <div className="alert-banner danger">
                                <span>
                                    ⚠ <strong>{overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''} overdue:</strong>{' '}
                                    {overdueTasks.slice(0, 4).map(t => t.title).join(', ')}
                                    {overdueTasks.length > 4 ? ` +${overdueTasks.length - 4} more` : ''}
                                </span>
                                <button className="alert-dismiss" onClick={() => setAlertDismissed(true)}>×</button>
                            </div>
                        )}
                        {approachingTasks.length > 0 && (
                            <div className="alert-banner warning">
                                <span>
                                    🕐 <strong>{approachingTasks.length} task{approachingTasks.length !== 1 ? 's' : ''} due within 2 days:</strong>{' '}
                                    {approachingTasks.slice(0, 4).map(t => t.title).join(', ')}
                                    {approachingTasks.length > 4 ? ` +${approachingTasks.length - 4} more` : ''}
                                </span>
                                <button className="alert-dismiss" onClick={() => setAlertDismissed(true)}>×</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Stats strip: Low | Medium | High | Total */}
                <div className="queue-stats-row">
                    <div
                        className={`queue-stat${activeFilter === 'low' ? ' active' : ''}`}
                        onClick={() => toggleFilter('low')}
                    >
                        <span className="queue-stat-value" style={{ color: '#71717a' }}>{lowCount}</span>
                        <span className="queue-stat-label">Low Priority</span>
                    </div>
                    <div
                        className={`queue-stat${activeFilter === 'medium' ? ' active' : ''}`}
                        onClick={() => toggleFilter('medium')}
                    >
                        <span className="queue-stat-value" style={{ color: '#ca8a04' }}>{medCount}</span>
                        <span className="queue-stat-label">Medium Priority</span>
                    </div>
                    <div
                        className={`queue-stat${activeFilter === 'high' ? ' active' : ''}`}
                        onClick={() => toggleFilter('high')}
                    >
                        <span className="queue-stat-value" style={{ color: '#ea580c' }}>{highCount}</span>
                        <span className="queue-stat-label">High Priority</span>
                    </div>
                    <div
                        className={`queue-stat${activeFilter === null ? ' active' : ''}`}
                        onClick={() => setActiveFilter(null)}
                    >
                        <span className="queue-stat-value">{totalCount}</span>
                        <span className="queue-stat-label">Total</span>
                    </div>
                </div>

                {/* Bulk action bar */}
                {selected.size > 0 && (
                    <div className="bulk-action-bar">
                        <span>{selected.size} task{selected.size !== 1 ? 's' : ''} selected</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="Hours taken"
                                value={hoursInput}
                                onChange={(e) => setHoursInput(e.target.value)}
                                style={{
                                    width: '9rem', padding: '0.3rem 0.5rem',
                                    background: 'var(--surface-2)', border: '1px solid var(--border-color)',
                                    borderRadius: '4px', color: 'var(--text-1)', fontSize: '0.82rem'
                                }}
                            />
                            <button className="btn-sm btn-success" onClick={handleBulkDone}>
                                Mark Done
                            </button>
                            {selected.size === 1 && (
                                <button
                                    className="btn-sm"
                                    style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.25)' }}
                                    onClick={handleOpenEdit}
                                >
                                    Edit
                                </button>
                            )}
                            <button className="btn-sm btn-danger" onClick={handleDeleteSelected}>
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="error-msg">{error}</div>}

                {loading ? (
                    <div className="loading">Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '2.5rem' }}>🎉</div>
                        <h3 style={{ marginTop: '0.8rem' }}>All clear!</h3>
                        <p>No pending tasks. Hit <strong>+ Add Task</strong> to get started.</p>
                    </div>
                ) : (
                    <>
                        <div className="task-list-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div className="task-checkbox-wrap" style={{ padding: '0 0.2rem 0 0' }}>
                                    <input
                                        type="checkbox"
                                        className="task-checkbox"
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        title="Select all"
                                    />
                                </div>
                                <span className="task-count-badge">{displayedTasks.length} tasks{activeFilter ? ' (filtered)' : ''}</span>
                            </div>
                        </div>

                        <div className="task-list">
                            {displayedTasks.map(task => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
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
                                        <span style={{ color: 'var(--accent)' }}>{start}–{end}</span> of {totalCount}
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
