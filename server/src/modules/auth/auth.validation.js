import { z } from 'zod';

// Zod strips fields that aren't in the schema, so a client can't smuggle in
// organization, org_role or system_role through the register body.

export const registerSchema = z.object({
    username: z
        .string({ error: 'Username is required' })
        .trim()
        .toLowerCase()
        .min(4, 'Username must be at least 4 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, _ . -'),
    email: z
        .string({ error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address'),
    password: z
        .string({ error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be at most 72 characters') // bcrypt ignores anything past 72 bytes
});

export const loginSchema = z.object({
    email: z
        .string({ error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address'),
    password: z
        .string({ error: 'Password is required' })
        .min(1, 'Password is required')
});