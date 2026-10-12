import express from 'express';
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';
import { getOrganizationHistory, getTaskHistoryEntries } from './history.controller.js';

const router = express.Router();

// GET /api/history, whole organization feed (managers and admins)
router.get('/', requireAuth, requireOrgRole('MANAGER'), getOrganizationHistory);

// GET /api/history/task/:taskId, history of one task
// members only see tasks they created or are assigned to
router.get('/task/:taskId', requireAuth, requireOrgRole('MEMBER'), getTaskHistoryEntries);

// No POST, PUT or DELETE: history is only written by the service when a task changes

export default router;