import History from './history.model.js';

// fields worth logging when they change
const TRACKED_FIELDS = ['title', 'content', 'status', 'priority', 'deadline', 'assigned_to', 'deleted_at'];

const normalize = (value) => (value && value.toString ? value.toString() : value ?? null);

// compare two plain task objects, returns { field: { from, to } }
export function diffTask(before, after) {
    const changes = {};
    for (const field of TRACKED_FIELDS) {
        const from = normalize(before[field]);
        const to = normalize(after[field]);
        if (from !== to) changes[field] = { from, to };
    }
    return changes;
}

function inferAction(changes) {
    if ('deleted_at' in changes) return changes.deleted_at.to ? 'DELETED' : 'RESTORED';
    if ('status' in changes) return 'STATUS_CHANGED';
    if ('assigned_to' in changes) return 'ASSIGNED';
    return 'UPDATED';
}

// Low-level write. Only organization tasks are logged.
export async function recordHistory({ task, user, action, changes = {} }) {
    if (!task.organization) return null;
    return History.create({
        task: task._id,
        organization: task.organization,
        user,
        action,
        changes
    });
}

// Call after saving a task update:
//   const before = task.toObject();
//   ...apply changes...
//   await task.save();
//   await recordTaskUpdate(before, task, req.user._id);
export async function recordTaskUpdate(before, taskDoc, userId) {
    const changes = diffTask(before, taskDoc.toObject());
    if (Object.keys(changes).length === 0) return null;
    return recordHistory({ task: taskDoc, user: userId, action: inferAction(changes), changes });
}

export const recordTaskCreated = (taskDoc, userId) =>
    recordHistory({ task: taskDoc, user: userId, action: 'CREATED' });

export const recordChecklistToggle = (taskDoc, userId, item) =>
    recordHistory({
        task: taskDoc,
        user: userId,
        action: 'CHECKLIST_TOGGLED',
        changes: { checklist: { item: item.text, isDone: item.isDone } }
    });

// Read helpers, always scoped to an organization
export async function getTaskHistory(taskId, organizationId, { page = 1, limit = 20 } = {}) {
    return History.find({ task: taskId, organization: organizationId })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'username');
}

export async function getOrgHistory(organizationId, { page = 1, limit = 20, user, action } = {}) {
    const filter = { organization: organizationId };
    if (user) filter.user = user;
    if (action) filter.action = action;

    const [entries, total] = await Promise.all([
        History.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user', 'username')
            .populate('task', 'title'),
        History.countDocuments(filter)
    ]);
    return { entries, total, page, pages: Math.ceil(total / limit) };
}