import Task from '../task/task.model.js';
import createResponse from '../../utils/response.js';
import { getOrgHistory, getTaskHistory } from './history.service.js';

const ROLE_RANK = { MEMBER: 1, MANAGER: 2, ADMIN: 3 };
const isManager = (user) => ROLE_RANK[user.org_role] >= ROLE_RANK.MANAGER;

const pageParams = (query) => ({
    page: Math.max(parseInt(query.page) || 1, 1),
    limit: Math.min(parseInt(query.limit) || 20, 100)
});

export async function getOrganizationHistory(req, res, next) {
    try {
        const result = await getOrgHistory(req.user.organization, {
            ...pageParams(req.query),
            user: req.query.user,
            action: req.query.action
        });
        return res.status(200).json(createResponse({ status: 200, data: result, message: 'Organization history found' }));
    } catch (error) {
        return next(error);
    }
}

export async function getTaskHistoryEntries(req, res, next) {
    try {
        const task = await Task.findOne({
            _id: req.params.taskId,
            organization: req.user.organization,
            deleted_at: null
        });
        if (!task) return res.status(404).json(createResponse({ status: 404, message: 'Task not found' }));

        const involved = [task.created_by, task.assigned_to]
            .filter(Boolean)
            .some((id) => id.equals(req.user._id));
        if (!involved && !isManager(req.user)) {
            return res.status(403).json(createResponse({ status: 403, message: 'Not allowed to view this task history' }));
        }

        const entries = await getTaskHistory(task._id, req.user.organization, pageParams(req.query));
        return res.status(200).json(createResponse({ status: 200, data: { entries }, message: 'Task history found' }));
    } catch (error) {
        return next(error);
    }
}
