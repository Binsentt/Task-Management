import { z } from 'zod';

export const emptySchema = z.object({});

export const pingSchema = z.object({
    target_id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
});

export const pingResponseSchema = z.object({
    ping_id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
});