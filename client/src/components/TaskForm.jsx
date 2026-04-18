import React, { useState, useEffect } from 'react';
import { createTask, updateTask } from '../api';
import ExcelImport from './ExcelImport';

const TaskForm = ({ onTaskAdded, editTask }) => {
    const [title, setTitle]               = useState('');
    const [deadlineDays, setDeadlineDays] = useState(7);
    const [effort, setEffort]             = useState(3);
    const [impact, setImpact]             = useState(5);
    const [workload, setWorkload]         = useState(1.0);
    const [submitting, setSubmitting]     = useState(false);
    const [error, setError]               = useState('');
    const [success, setSuccess]           = useState(false);

    useEffect(() => {
        if (editTask) {
            setTitle(editTask.title || '');
            setDeadlineDays(editTask.deadline_days ?? 7);
            setEffort(editTask.effort ?? 3);
            setImpact(editTask.impact ?? 5);
            setWorkload(editTask.workload ?? 1.0);
        } else {
            setTitle('');
            setDeadlineDays(7);
            setEffort(3);
            setImpact(5);
            setWorkload(1.0);
        }
        setError('');
        setSuccess(false);
    }, [editTask]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

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
            };
            if (editTask) {
                await updateTask(editTask.id, data);
            } else {
                await createTask(data);
                setTitle('');
                setDeadlineDays(7);
                setEffort(3);
                setImpact(5);
                setWorkload(1.0);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2500);
            }
            if (onTaskAdded) onTaskAdded();
        } catch (err) {
            setError(err.message || 'Could not save task. Is the server running?');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} noValidate>
                {error   && <div className="error-msg">{error}</div>}
                {success && <div style={{ color: 'var(--success-color)', fontSize: '0.88rem', marginBottom: '0.8rem', textAlign: 'center' }}>✓ Task queued successfully!</div>}

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
                        max="3650"
                        className="form-control"
                        value={deadlineDays}
                        onChange={(e) => setDeadlineDays(e.target.value)}
                    />
                </div>

                <div className="two-col">
                    <div className="form-group">
                        <label htmlFor="task-effort">Effort (hrs)</label>
                        <input
                            id="task-effort"
                            type="number"
                            min="1" max="200"
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
                        min="0.1" max="10" step="0.1"
                        className="form-control"
                        value={workload}
                        onChange={(e) => setWorkload(e.target.value)}
                    />
                </div>

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
