const API_BASE = 'http://localhost:3001/api';

// --- USERS ---
export const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
};

export const createUser = async (data) => {
    const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
};

// --- TASKS ---
export const fetchTasks = async ({ page = 1, pageSize = 50 } = {}) => {
    const res = await fetch(`${API_BASE}/tasks?page=${page}&pageSize=${pageSize}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json(); // { tasks, total, page, pageSize, totalPages }
};

export const createTask = async (data) => {
    const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
};

export const importTasks = async (tasksArray) => {
    const results = [];
    for (const task of tasksArray) {
        results.push(await createTask(task));
    }
    return results;
};

export const completeTask = async (taskId, hours_taken) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', hours_taken })
    });
    if (!res.ok) throw new Error('Failed to complete task');
    return res.json();
};

export const deleteTask = async (taskId) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
};

export const deleteTasksBulk = async (ids) => {
    const res = await fetch(`${API_BASE}/tasks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    if (!res.ok) throw new Error('Failed to delete tasks');
    return res.json();
};

export const updateTask = async (taskId, data) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
};

// --- STATS ---
export const fetchStats = async () => {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
};

// --- COMPLETED TASKS (velocity tracker) ---
export const fetchCompletedTasks = async ({ page = 1, pageSize = 5, search = '' } = {}) => {
    const res = await fetch(`${API_BASE}/completed-tasks?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error('Failed to fetch completed tasks');
    return res.json();
};
