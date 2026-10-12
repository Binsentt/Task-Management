import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTaskSchema, updateTaskSchema } from './task.validation.js';
import { getTasks, getOrganizationCompletion, getTask, createTask, updateTask, deleteTask } from './task.controller.js';

const router = express.Router();

// every task route needs a logged-in user, access rules per task live in the service
router.use(requireAuth);

router.get('/', getTasks);
router.post('/', validate(createTaskSchema), createTask);
router.get('/organization/completion', getOrganizationCompletion);
router.get('/:id', getTask);
router.patch('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

export default router;