import express from 'express';
import Task from '../task/task.model.js'
import { getOrgHistory, getTaskHistory } from './history.service.js';
// assumed middleware from earlier: requireAuth sets req.user, requireOrgRole(minRole) checks org_role
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';

const router = express.Router();

const ROLE_RANK = { MEMBER: 1, MANAGER: 2, ADMIN: 3 };
const isManager = (user) => ROLE_RANK[user.org_role] >= ROLE_RANK.MANAGER;

const pageParams = (query) => ({
    page: Math.max(parseInt(query.page) || 1, 1),
    limit: Math.min(parseInt(query.limit) || 20, 100)
});

// GET /api/history, whole organization feed (managers and admins)
router.get('/', requireAuth, requireOrgRole('MANAGER'), async (req, res, next) => {
    try {
        const { user, action } = req.query;
        const result = await getOrgHistory(req.user.organization, {
            ...pageParams(req.query),
            user,
            action
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/history/task/:taskId, history of one task
// members only see tasks they created or are assigned to
router.get('/task/:taskId', requireAuth, requireOrgRole('MEMBER'), async (req, res, next) => {
    try {
        const task = await Task.findOne({
            _id: req.params.taskId,
            organization: req.user.organization
        });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const involved = [task.created_by, task.assigned_to]
            .filter(Boolean)
            .some((id) => id.equals(req.user._id));
        if (!involved && !isManager(req.user)) {
            return res.status(403).json({ message: 'Not allowed to view this task history' });
        }

        const entries = await getTaskHistory(task._id, req.user.organization, pageParams(req.query));
        res.json({ entries });
    } catch (err) {
        next(err);
    }
});

// No POST, PUT or DELETE: history is only written by the service when a task changes

export default router;