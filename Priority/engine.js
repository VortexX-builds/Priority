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

function calculatePriority(task, avgVelocity = 1.0) {
    const { impact, effort, deadline_days, workload, created_at } = task;

    const createdAt = created_at ? new Date(created_at) : new Date();
    const dueDate = new Date(createdAt.getTime() + (deadline_days || 1) * 24 * 3600 * 1000);
    let hoursRemaining = (dueDate - new Date()) / 3600000;

    if (hoursRemaining <= 0.1) hoursRemaining = 0.1;

    // Faster users (avgVelocity > 1) get a lower effective effort penalty
    const effectiveEffort = (effort || 1) / Math.max(0.5, avgVelocity);

    const score =
        (impact * 0.4) +
        ((1 / hoursRemaining) * 0.3) -
        (effectiveEffort * 0.15) -
        ((workload || 1.0) * 0.15);

    const clampedScore = Math.max(0, score);
    return {
        score: Number(clampedScore.toFixed(4)),
        label: getPriorityLabel(clampedScore)
    };
}

function updateTaskPriority(taskId, callback = () => {}) {
    db.get(`SELECT * FROM Tasks WHERE id = ?`, [taskId], (err, row) => {
        if (err || !row) return callback(err || new Error('Task not found'));

        const applyScore = (avgVelocity = 1.0) => {
            const { score, label } = calculatePriority(row, avgVelocity);
            db.run(
                `UPDATE Tasks SET priority_score = ?, priority_label = ? WHERE id = ?`,
                [score, label, taskId],
                function(err) { callback(err, score, label); }
            );
        };

        if (row.user_id) {
            db.get(`SELECT avg_velocity FROM Users WHERE id = ?`, [row.user_id], (err, user) => {
                applyScore((!err && user) ? user.avg_velocity : 1.0);
            });
        } else {
            applyScore(1.0);
        }
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
