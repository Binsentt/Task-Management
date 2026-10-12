import express from 'express';
import { requireAuth, requireOrgRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    createOrganizationSchema,
    joinOrganizationSchema,
    updateSettingsSchema,
    updateRoleSchema,
    transferOwnershipSchema
} from './organization.validation.js';
import {
    getCurrent,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    getMembers,
    rotateInviteCode,
    updateSettings,
    updateMemberRole,
    removeMember,
    transferOwnership,
    deleteOrganization
} from './organization.controller.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getCurrent);
router.post('/', validate(createOrganizationSchema), createOrganization);
router.post('/join', validate(joinOrganizationSchema), joinOrganization);
router.post('/leave', leaveOrganization);
router.get('/members', requireOrgRole('MEMBER'), getMembers);
router.post('/invite-code/rotate', requireOrgRole('MANAGER'), rotateInviteCode);
router.patch('/settings', requireOrgRole('ADMIN'), validate(updateSettingsSchema), updateSettings);
router.patch('/members/:memberId/role', requireOrgRole('ADMIN'), validate(updateRoleSchema), updateMemberRole);
router.delete('/members/:memberId', requireOrgRole('MANAGER'), removeMember);
router.post('/ownership', requireOrgRole('ADMIN'), validate(transferOwnershipSchema), transferOwnership);
router.delete('/me', requireOrgRole('ADMIN'), deleteOrganization);

export default router;
