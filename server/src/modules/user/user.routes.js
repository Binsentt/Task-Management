import express from 'express';
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { updateProfileSchema } from './user.validation.js';
import { getProfile, updateProfile, getOrganizationMembers } from './user.controller.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getProfile);
router.patch('/me', validate(updateProfileSchema), updateProfile);
router.get('/organization-members', requireOrgRole('MEMBER'), getOrganizationMembers);

export default router;
