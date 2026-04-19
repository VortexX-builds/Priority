const express = require('express');
const cors = require('cors');
const db = require('./db');
const { updateTaskPriority, recalculateAllPriorities, logTaskCompletionTracking } = require('./engine');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Schedule 5-minute recalculation
setInterval(() => {
    recalculateAllPriorities();
}, 5 * 60 * 1000);

// --- USERS API ---
app.post('/api/users', (req, res) => {
    const { name, role } = req.body;
    db.run(`INSERT INTO Users (name, role) VALUES (?, ?)`, [name, role || 'MEMBER'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name, role });
    });
});

app.get('/api/users', (req, res) => {
    db.all(`SELECT * FROM Users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- TASKS API ---
app.post('/api/tasks', (req, res) => {
    const { external_task_id, title, deadline_days, effort, impact, workload, user_id } = req.body;

    const dd = parseInt(deadline_days, 10);
    const ef = parseInt(effort, 10);
    const im = parseInt(impact, 10);
    const wl = parseFloat(workload);

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    if (isNaN(dd) || dd < 1 || dd > 365)   return res.status(400).json({ error: 'deadline_days must be 1–365' });
    if (isNaN(ef) || ef < 1 || ef > 20)    return res.status(400).json({ error: 'effort must be 1–20' });
    if (isNaN(im) || im < 1 || im > 10)    return res.status(400).json({ error: 'impact must be 1–10' });
    if (isNaN(wl) || wl < 1 || wl > 10)    return res.status(400).json({ error: 'workload must be 1–10' });

    const query = `
        INSERT INTO Tasks (external_task_id, title, deadline_days, effort, impact, workload, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
        external_task_id || null,
        String(title).trim(),
        dd, ef, im, wl,
        user_id || null
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newTaskId = this.lastID;

        updateTaskPriority(newTaskId, (err, score, label) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: newTaskId, priority_score: score, priority_label: label });
        });
    });
});

app.get('/api/tasks', (req, res) => {
    const page     = Math.max(1, parseInt(req.query.page)     || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50));
    const offset   = (page - 1) * pageSize;

    db.get(`SELECT COUNT(*) as total FROM Tasks WHERE status != 'COMPLETED'`, [], (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countRow.total;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        const query = `
            SELECT Tasks.*, Users.name as user_name
            FROM Tasks
            LEFT JOIN Users ON Tasks.user_id = Users.id
            WHERE Tasks.status != 'COMPLETED'
            ORDER BY Tasks.priority_score DESC
            LIMIT ? OFFSET ?
        `;
        db.all(query, [pageSize, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ tasks: rows, total, page, pageSize, totalPages });
        });
    });
});

app.patch('/api/tasks/:id/status', (req, res) => {
    const taskId = req.params.id;
    const { status, hours_taken } = req.body;

    db.run(`UPDATE Tasks SET status = ? WHERE id = ?`, [status, taskId], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        if (status === 'COMPLETED' && hours_taken) {
            logTaskCompletionTracking(taskId, hours_taken, (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Task completed and velocity tracked.' });
            });
        } else {
            updateTaskPriority(taskId, (err, score, label) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Status updated', new_score: score, priority_label: label });
            });
        }
    });
});

app.patch('/api/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const { title, deadline_days, effort, impact, workload, user_id } = req.body;

    const dd = parseInt(deadline_days, 10);
    const ef = parseInt(effort, 10);
    const im = parseInt(impact, 10);
    const wl = parseFloat(workload);

    if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
    if (isNaN(dd) || dd < 1 || dd > 365)   return res.status(400).json({ error: 'deadline_days must be 1–365' });
    if (isNaN(ef) || ef < 1 || ef > 20)    return res.status(400).json({ error: 'effort must be 1–20' });
    if (isNaN(im) || im < 1 || im > 10)    return res.status(400).json({ error: 'impact must be 1–10' });
    if (isNaN(wl) || wl < 1 || wl > 10)    return res.status(400).json({ error: 'workload must be 1–10' });

    db.run(
        `UPDATE Tasks SET title=?, deadline_days=?, effort=?, impact=?, workload=?, user_id=? WHERE id=?`,
        [String(title).trim(), dd, ef, im, wl, user_id || null, taskId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            updateTaskPriority(taskId, (err, score, label) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ priority_score: score, priority_label: label });
            });
        }
    );
});

app.delete('/api/tasks', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ error: 'ids array required' });

    const CHUNK = 999;
    let totalDeleted = 0;
    let idx = 0;

    const deleteNext = () => {
        if (idx >= ids.length) return res.json({ deleted: totalDeleted });
        const batch = ids.slice(idx, idx + CHUNK);
        idx += CHUNK;
        const placeholders = batch.map(() => '?').join(',');
        db.run(`DELETE FROM Tasks WHERE id IN (${placeholders})`, batch, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            totalDeleted += this.changes;
            deleteNext();
        });
    };

    deleteNext();
});

app.delete('/api/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    db.run(`DELETE FROM Tasks WHERE id = ?`, [taskId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted.' });
    });
});

// Stats summary for dashboard
app.get('/api/stats', (req, res) => {
    const stats = {};
    db.get(`SELECT COUNT(*) as total FROM Tasks`, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total = row.total;

        db.get(`SELECT COUNT(*) as completed FROM Tasks WHERE status = 'COMPLETED'`, [], (err, row2) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.completed = row2.completed;
            stats.pending = stats.total - stats.completed;

            // Overdue: due_date (created_at + deadline_days) is in the past
            db.get(
                `SELECT COUNT(*) as overdue FROM Tasks
                 WHERE status != 'COMPLETED'
                   AND created_at IS NOT NULL
                   AND datetime(created_at, '+' || deadline_days || ' days') < datetime('now')`,
                [],
                (err, row3) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.overdue = row3.overdue;
                    res.json(stats);
                }
            );
        });
    });
});

app.get('/api/completed-tasks', (req, res) => {
    const page     = Math.max(1, parseInt(req.query.page)     || 1);
    const pageSize = Math.min(50,  Math.max(1, parseInt(req.query.pageSize) || 5));
    const search   = req.query.search ? `%${req.query.search}%` : '%';
    const offset   = (page - 1) * pageSize;

    db.get(
        `SELECT COUNT(*) as total FROM Tasks WHERE status = 'COMPLETED' AND title LIKE ?`,
        [search],
        (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const total      = countRow.total;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));

            const query = `
                SELECT Tasks.id, Tasks.title, Tasks.effort, Logic_Logs.actual_duration
                FROM Tasks
                LEFT JOIN Logic_Logs ON Tasks.id = Logic_Logs.task_id
                WHERE Tasks.status = 'COMPLETED'
                  AND Tasks.title LIKE ?
                ORDER BY Tasks.id DESC
                LIMIT ? OFFSET ?
            `;
            db.all(query, [search, pageSize, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                const tasks = rows.map(t => ({
                    id:             t.id,
                    title:          t.title,
                    effort:         t.effort,
                    velocity_score: t.actual_duration
                        ? parseFloat(((t.effort * 1.5) / t.actual_duration).toFixed(3))
                        : null,
                }));

                res.json({ tasks, total, page, pageSize, totalPages });
            });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Priority running on port ${PORT}`);
});
