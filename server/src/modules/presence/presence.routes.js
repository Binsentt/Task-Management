import express from 'express';
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { emptySchema, pingSchema } from './presence.validation.js';
import { heartbeat, getPresence, sendPing, respondToPing, getPings } from './presence.controller.js';

const router = express.Router();

router.use(requireAuth);
router.post('/heartbeat', validate(emptySchema), heartbeat);
router.get('/', getPresence);
router.get('/pings', requireOrgRole('MANAGER'), getPings);
router.post('/pings', requireOrgRole('MANAGER'), validate(pingSchema), sendPing);
router.post('/pings/:pingId/respond', validate(emptySchema), respondToPing);

export default router;