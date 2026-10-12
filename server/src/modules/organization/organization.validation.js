import { z } from 'zod';

export const createOrganizationSchema = z.object({
    name: z.string().trim().min(2).max(60),
    settings: z.object({
        timezone: z.string().trim().min(1).optional(),
        max_shift_hours: z.number().min(1).max(24).optional()
    }).optional()
});

export const joinOrganizationSchema = z.object({
    invite_code: z.string().trim().min(1).max(20)
});

export const updateSettingsSchema = z.object({
    timezone: z.string().trim().min(1).optional(),
    max_shift_hours: z.number().min(1).max(24).optional()
});

export const updateRoleSchema = z.object({
    org_role: z.enum(['MEMBER', 'MANAGER', 'ADMIN'])
});

export const transferOwnershipSchema = z.object({
    member_id: z.string().regex(/^[a-f\d]{24}$/i)
});