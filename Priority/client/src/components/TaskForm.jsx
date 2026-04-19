import React, { useState, useEffect } from 'react';
import { createTask, updateTask, fetchUsers } from '../api';
import ExcelImport from './ExcelImport';

const LABEL_COLORS = {
    Critical: '#dc2626',
    High:     '#ea580c',
    Medium:   '#ca8a04',
    Low:      '#71717a',
};

const TaskForm = ({ onTaskAdded, editTask }) => {
    const [title, setTitle]               = useState('');
    const [deadlineDays, setDeadlineDays] = useState(7);
    const [effort, setEffort]             = useState(3);
    const [impact, setImpact]             = useState(5);
    const [workload, setWorkload]         = useState(1.0);
    const [userId, setUserId]             = useState('');
    const [users, setUsers]               = useState([]);
    const [submitting, setSubmitting]     = useState(false);
    const [error, setError]               = useState('');
    const [success, setSuccess]           = useState(false);
    const [lastPriority, setLastPriority] = useState(null);

    useEffect(() => {
        fetchUsers().then(setUsers).catch(() => {});
    }, []);

    useEffect(() => {
        if (editTask) {
            setTitle(editTask.title || '');
            setDeadlineDays(editTask.deadline_days ?? 7);
            setEffort(editTask.effort ?? 3);
            setImpact(editTask.impact ?? 5);
            setWorkload(editTask.workload ?? 1.0);
            setUserId(editTask.user_id ? String(editTask.user_id) : '');
        } else {
            setTitle('');
            setDeadlineDays(7);
            setEffort(3);
            setImpact(5);
            setWorkload(1.0);
            setUserId('');
        }
        setError('');
        setSuccess(false);
        setLastPriority(null);
    }, [editTask]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLastPriority(null);

        if (!title.trim()) { setError('Task title is required.'); return; }
        if (!deadlineDays || deadlineDays < 1) { setError('Days until due must be at least 1.'); return; }

        setSubmitting(true);
        try {
            const data = {
                title:         title.trim(),
                deadline_days: parseInt(deadlineDays, 10),
                effort:        parseInt(effort, 10),
                impact:        parseInt(impact, 10),
                workload:      parseFloat(workload),
                user_id:       userId ? parseInt(userId, 10) : null,
            };
            if (editTask) {
                await updateTask(editTask.id, data);
            } else {
                const created = await createTask(data);
                setLastPriority({
                    label: created.priority_label || 'Low',
                    score: created.priority_score ?? 0,
                });
                setTitle('');
                setDeadlineDays(7);
                setEffort(3);
                setImpact(5);
                setWorkload(1.0);
                setSuccess(true);
                setTimeout(() => { setSuccess(false); setLastPriority(null); }, 4000);
            }
            if (onTaskAdded) onTaskAdded();
        } catch (err) {
            setError(err.message || 'Could not save task. Is the server running?');
        } finally {
            setSubmitting(false);
        }
    };

    const editLabel = editTask?.priority_label;
    const editScore = editTask?.priority_score;
    const editColor = LABEL_COLORS[editLabel] || '#71717a';

    return (
        <>
            <form onSubmit={handleSubmit} noValidate>
                {error && <div className="error-msg">{error}</div>}

                {/* Edit mode: show current priority badge */}
                {editTask && editLabel && (
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                        <span>Current priority:</span>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700,
                            fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: editColor, background: `${editColor}18`, border: `1px solid ${editColor}33`
                        }}>
                            {editLabel}
                            {editScore != null && <span style={{ opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>· {Number(editScore).toFixed(2)}</span>}
                        </span>
                    </div>
                )}

                {/* Create success: show calculated priority */}
                {success && lastPriority && (() => {
                    const c = LABEL_COLORS[lastPriority.label] || '#71717a';
                    return (
                        <div style={{ marginBottom: '0.9rem', textAlign: 'center' }}>
                            <div style={{ color: 'var(--success-color)', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                                ✓ Task queued successfully!
                            </div>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.3rem 0.75rem', borderRadius: '4px', fontWeight: 700,
                                fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: c, background: `${c}18`, border: `1px solid ${c}33`
                            }}>
                                Priority: {lastPriority.label}
                                <span style={{ opacity: 0.7, fontFamily: 'JetBrains Mono, monospace', fontWeight: 400 }}>
                                    score {Number(lastPriority.score).toFixed(2)}
                                </span>
                            </span>
                        </div>
                    );
                })()}

                <div className="form-group">
                    <label htmlFor="task-title">Task Title</label>
                    <input
                        id="task-title"
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fix authentication edge case"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="task-deadline-days">Days Until Due</label>
                    <input
                        id="task-deadline-days"
                        type="number"
                        min="1"
                        max="365"
                        className="form-control"
                        value={deadlineDays}
                        onChange={(e) => setDeadlineDays(e.target.value)}
                    />
                </div>

                <div className="two-col">
                    <div className="form-group">
                        <label htmlFor="task-effort">Effort (1–20)</label>
                        <input
                            id="task-effort"
                            type="number"
                            min="1" max="20"
                            className="form-control"
                            value={effort}
                            onChange={(e) => setEffort(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="task-impact">Impact (1–10)</label>
                        <input
                            id="task-impact"
                            type="number"
                            min="1" max="10"
                            className="form-control"
                            value={impact}
                            onChange={(e) => setImpact(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="task-workload">Workload</label>
                    <input
                        id="task-workload"
                        type="number"
                        min="1" max="10" step="0.1"
                        className="form-control"
                        value={workload}
                        onChange={(e) => setWorkload(e.target.value)}
                    />
                </div>

                {users.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="task-assignee">Assign to (optional)</label>
                        <select
                            id="task-assignee"
                            className="form-control"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        >
                            <option value="">— None —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                >
                    {submitting ? (editTask ? 'Saving…' : 'Adding…') : (editTask ? 'Save Changes' : 'Add Task')}
                </button>
            </form>

            {!editTask && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.4rem 0 1rem' }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-color)', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>OR IMPORT FROM EXCEL</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                    </div>
                    <ExcelImport onTaskAdded={onTaskAdded} />
                </>
            )}
        </>
    );
};

export default TaskForm;
