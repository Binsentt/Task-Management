import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.coerce.date({ error: 'Invalid date' });

export const clockInSchema = z.object({
    task: objectId.nullable().optional(),
    note: z.string().trim().max(500).optional(),
    time_in: date.optional()
});

export const clockOutSchema = z.object({
    note: z.string().trim().max(500).optional(),
    time_out: date.optional()
});

export const correctionSchema = z.object({
    task: objectId.nullable().optional(),
    time_in: date.optional(),
    time_out: date.nullable().optional(),
    note: z.string().trim().max(500).optional()
});