import express from 'express';
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { clockInSchema, clockOutSchema, correctionSchema } from './remoteshift.validation.js';
import { clockIn, clockOut, getShifts, correctShift } from './remoteshift.controller.js';

const router = express.Router();

router.use(requireAuth);
router.post('/clock-in', validate(clockInSchema), clockIn);
router.post('/clock-out', validate(clockOutSchema), clockOut);
router.get('/', getShifts);
router.patch('/:shiftId', requireOrgRole('MANAGER'), validate(correctionSchema), correctShift);

export default router;
