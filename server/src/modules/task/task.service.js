import Task from './task.model.js';
import User from '../user/user.model.js';
import createResponse from '../../utils/response.js';
import { recordTaskCreated, recordTaskUpdate } from '../history/history.service.js';

// Allowlists: only these fields can ever come from the client.
// Everything else (created_by, organization, completed_at, deleted_at...) is set by the server.
const CREATABLE = ['title', 'content', 'status', 'priority', 'deadline', 'checklist'];
const EDITABLE = [...CREATABLE];

const pick = (obj = {}, allowed) =>
    Object.fromEntries(Object.entries(obj).filter(([key]) => allowed.includes(key)));

const isManager = (user) => ['MANAGER', 'ADMIN'].includes(user.org_role);

// Tasks this user is allowed to see: their own personal tasks + their org's tasks
const visibleTo = (user) => ({
    deleted_at: null,
    $or: [
        { organization: null, created_by: user._id },
        ...(user.organization ? [{ organization: user.organization }] : [])
    ]
});

const visibleForScope = (user, scope) => {
    if (scope === 'personal') {
        return { deleted_at: null, organization: null, created_by: user._id };
    }
    if (scope === 'organization') {
        if (!user.organization) {
            return null;
        }
        return { deleted_at: null, organization: user.organization };
    }
    return visibleTo(user);
};

// Who may edit or delete: the creator, the assignee, or a manager/admin (org tasks only)
const canModify = (user, task) => {
    if (task.created_by.equals(user._id)) return true;
    if (!task.organization) return false;
    return Boolean(task.assigned_to?.equals(user._id)) || isManager(user);
};

// Returns an error message, or null when the assignment is allowed
async function checkAssignment(user, organization, assignedTo) {
    if (!organization) return 'Personal tasks cannot be assigned';
    if (!isManager(user)) return 'Only managers can assign tasks';
    if (assignedTo !== null) {
        const inOrg = await User.exists({ _id: assignedTo, organization });
        if (!inOrg) return 'Assignee is not in this organization';
    }
    return null;
}

// Turn known errors into proper status codes, log the unknown ones
function handleError(error) {
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((e) => e.message).join(', ');
        return createResponse(400, null, message);
    }
    if (error.name === 'CastError') {
        return createResponse(400, null, 'Invalid id');
    }
    console.error(error);
    return createResponse(500, null, 'Internal server error');
}

// user is always the authenticated user (req.user), never taken from the request body

export async function getOneTask(user, id) {
    try {
        const task = await Task.findOne({ _id: id, ...visibleTo(user) });
        if (!task) return createResponse(404, null, 'Task not found');
        return createResponse(200, task, 'Task found');
    } catch (error) {
        return handleError(error);
    }
}

export async function getTasks(user, { page = 1, limit = 20, status, scope = 'all' } = {}) {
    try {
        if (!['all', 'personal', 'organization'].includes(scope)) {
            return createResponse(400, null, 'Invalid task scope');
        }
        const filter = visibleForScope(user, scope);
        if (!filter) {
            return createResponse(403, null, 'You must belong to an organization');
        }
        // typeof check blocks query-string injection like ?status[$ne]=DONE
        if (typeof status === 'string') filter.status = status;

        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

        const [tasks, total] = await Promise.all([
            Task.find(filter)
                .sort({ created_at: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit),
            Task.countDocuments(filter)
        ]);

        return createResponse(200, {
            tasks,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit)
        }, 'Tasks found');
    } catch (error) {
        return handleError(error);
    }
}

export async function getOrganizationCompletion(user) {
    try {
        if (!['MANAGER', 'ADMIN'].includes(user.org_role) || !user.organization) {
            return createResponse(403, null, 'Insufficient permissions');
        }

        const [members, summaries] = await Promise.all([
            User.find({ organization: user.organization })
                .select('_id username email org_role')
                .sort({ username: 1 })
                .lean(),
            Task.aggregate([
                {
                    $match: {
                        organization: user.organization,
                        assigned_to: { $ne: null },
                        deleted_at: null
                    }
                },
                {
                    $group: {
                        _id: '$assigned_to',
                        assigned: { $sum: 1 },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$status', 'DONE'] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);

        const summaryByUser = new Map(summaries.map((summary) => [summary._id.toString(), summary]));
        const report = members.map((member) => {
            const summary = summaryByUser.get(member._id.toString()) || { assigned: 0, completed: 0 };
            const active = summary.assigned - summary.completed;
            return {
                user: member,
                assigned: summary.assigned,
                completed: summary.completed,
                active,
                completion_percentage: summary.assigned
                    ? Math.round((summary.completed / summary.assigned) * 100)
                    : 0
            };
        });

        return createResponse(200, report, 'Organization completion report found');
    } catch (error) {
        return handleError(error);
    }
}

export async function addTask(user, body) {
    try {
        const data = pick(body, CREATABLE);
        data.created_by = user._id;

        if (body.is_org_task) {
            if (!user.organization) return createResponse(400, null, 'You are not in an organization');
            data.organization = user.organization;
        }

        if (body.assigned_to) {
            const problem = await checkAssignment(user, data.organization, body.assigned_to);
            if (problem) return createResponse(403, null, problem);
            data.assigned_to = body.assigned_to;
        }

        const task = await Task.create(data);
        await recordTaskCreated(task, user._id);
        return createResponse(201, task, 'Task created successfully');
    } catch (error) {
        return handleError(error);
    }
}

// Handles every edit, including marking a task DONE.
// completed_at is set by the model hook when status changes, so no separate "finished" function.
export async function updateTask(user, id, body) {
    try {
        const task = await Task.findOne({ _id: id, ...visibleTo(user) });
        if (!task) return createResponse(404, null, 'Task not found');
        if (!canModify(user, task)) return createResponse(403, null, 'Not allowed to edit this task');

        const updates = pick(body, EDITABLE);

        if ('assigned_to' in body) {
            const assignedTo = body.assigned_to ?? null;
            const problem = await checkAssignment(user, task.organization, assignedTo);
            if (problem) return createResponse(403, null, problem);
            updates.assigned_to = assignedTo;
        }

        if (Object.keys(updates).length === 0) {
            return createResponse(400, null, 'No valid fields to update');
        }

        const before = task.toObject();
        task.set(updates);
        await task.save(); // runs validators and the completed_at hook
        await recordTaskUpdate(before, task, user._id);

        return createResponse(200, task, 'Task updated successfully');
    } catch (error) {
        return handleError(error);
    }
}

// Soft delete: the task disappears from queries but history entries still point at it
export async function deleteTask(user, id) {
    try {
        const task = await Task.findOne({ _id: id, ...visibleTo(user) });
        if (!task) return createResponse(404, null, 'Task not found');
        if (!canModify(user, task)) return createResponse(403, null, 'Not allowed to delete this task');

        const before = task.toObject();
        task.deleted_at = new Date();
        await task.save();
        await recordTaskUpdate(before, task, user._id);

        return createResponse(200, null, 'Task deleted successfully');
    } catch (error) {
        return handleError(error);
    }
}