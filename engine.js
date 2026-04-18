const db = require('./db');

// Multi-Factor Scoring Logic
// P = (Impact × 0.4) + ((1 / HoursRemaining) × 0.3) - (Effort × 0.15) - (Workload × 0.15)
// HoursRemaining is computed dynamically from created_at + deadline_days

function getPriorityLabel(score) {
    if (score >= 5) return 'Critical';
    if (score >= 3) return 'High';
    if (score >= 1) return 'Medium';
    return 'Low';
}

function calculatePriority(task) {
    const { impact, effort, deadline_days, workload, created_at } = task;

    const createdAt = created_at ? new Date(created_at) : new Date();
    const dueDate = new Date(createdAt.getTime() + (deadline_days || 1) * 24 * 3600 * 1000);
    let hoursRemaining = (dueDate - new Date()) / 3600000;

    if (hoursRemaining <= 0.1) hoursRemaining = 0.1;

    const score =
        (impact * 0.4) +
        ((1 / hoursRemaining) * 0.3) -
        ((effort || 1) * 0.15) -
        ((workload || 1.0) * 0.15);

    return {
        score: Number(score.toFixed(4)),
        label: getPriorityLabel(score)
    };
}

function updateTaskPriority(taskId, callback = () => {}) {
    db.get(`SELECT * FROM Tasks WHERE id = ?`, [taskId], (err, row) => {
        if (err || !row) return callback(err || new Error('Task not found'));

        const { score, label } = calculatePriority(row);

        db.run(
            `UPDATE Tasks SET priority_score = ?, priority_label = ? WHERE id = ?`,
            [score, label, taskId],
            function(err) { callback(err, score, label); }
        );
    });
}

function recalculateAllPriorities() {
    console.log('[Cron] Recalculating all task priorities...');
    db.all(`SELECT id FROM Tasks WHERE status != 'COMPLETED'`, [], (err, rows) => {
        if (err) { console.error('[Cron] Error fetching tasks:', err); return; }
        rows.forEach(row => {
            updateTaskPriority(row.id, (updateErr) => {
                if (updateErr) console.error(`[Cron] Failed to update task ${row.id}:`, updateErr);
            });
        });
    });
}

function logTaskCompletionTracking(taskId, actualDurationHours, callback = () => {}) {
    db.get(`SELECT effort, user_id FROM Tasks WHERE id = ?`, [taskId], (err, task) => {
        if (err || !task) return callback(err);

        const expectedDuration = task.effort * 1.5;
        const relativeVelocity = actualDurationHours / expectedDuration;

        db.run(
            `INSERT INTO Logic_Logs (task_id, predicted_effort, actual_duration) VALUES (?, ?, ?)`,
            [taskId, task.effort, actualDurationHours],
            (err) => {
                if (err) return callback(err);

                if (task.effort >= 5 && task.user_id) {
                    db.get(`SELECT avg_velocity FROM Users WHERE id = ?`, [task.user_id], (err, user) => {
                        if (!err && user) {
                            const newAvg = (user.avg_velocity * 0.8) + (relativeVelocity * 0.2);
                            db.run(`UPDATE Users SET avg_velocity = ? WHERE id = ?`, [newAvg, task.user_id], callback);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(null);
                }
            }
        );
    });
}

module.exports = {
    calculatePriority,
    updateTaskPriority,
    recalculateAllPriorities,
    logTaskCompletionTracking
};
