import { z } from 'zod';

export const updateProfileSchema = z.object({
    username: z.string().trim().toLowerCase().min(4).max(30).regex(/^[a-z0-9_.-]+$/).optional(),
    email: z.string().trim().toLowerCase().email().optional()
});