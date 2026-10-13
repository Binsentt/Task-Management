import { z } from 'zod';

const usernameSchema = z
    .string({ error: 'Username is required' })
    .trim()
    .toLowerCase()
    .min(4, 'Username must be at least 4 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, _ . -');

const gmailSchema = z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .regex(/@gmail\.com$/, 'Email must end in @gmail.com');

const passwordSchema = z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => /\p{Lu}/u.test(password), 'Password must include an uppercase letter')
    .refine((password) => /\p{Ll}/u.test(password), 'Password must include a lowercase letter')
    .refine((password) => /\p{N}/u.test(password), 'Password must include a number')
    .refine((password) => /[^\p{L}\p{N}]/u.test(password), 'Password must include a symbol')
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes');

export const registerSchema = z.object({
    full_name: z
        .string({ error: 'Full name is required' })
        .trim()
        .min(1, 'Full name is required')
        .max(100, 'Full name must be at most 100 characters')
        .regex(/^(?:\p{L}\p{M}*)+(?: (?:\p{L}\p{M}*)+)*$/u, 'Full name can only contain letters and spaces'),
    username: usernameSchema,
    email: gmailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Please re-enter your password' }),
    contact_number: z
        .string({ error: 'Contact number is required' })
        .min(1, 'Contact number is required')
        .max(20, 'Contact number must be at most 20 digits')
        .regex(/^[0-9]+$/, 'Contact number can only contain digits'),
    account_type: z.enum(['individual', 'organization']),
    organization_name: z.string().trim().min(2).max(60).optional()
}).superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
        context.addIssue({
            code: 'custom',
            path: ['confirmPassword'],
            message: 'Passwords do not match'
        });
    }
    if (data.account_type === 'organization' && !data.organization_name) {
        context.addIssue({
            code: 'custom',
            path: ['organization_name'],
            message: 'Organization name is required'
        });
    }
});

export const loginSchema = z.object({
    identifier: z
        .string({ error: 'Username or email is required' })
        .trim()
        .toLowerCase()
        .min(1, 'Username or email is required')
        .max(320, 'Username or email is too long'),
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required')
});

export const availabilitySchema = z.object({
    username: usernameSchema.optional(),
    email: gmailSchema.optional()
}).refine((data) => Boolean(data.username) !== Boolean(data.email), {
    message: 'Check one username or email at a time'
});

export const resetRequestSchema = z.object({
    email: z.string({ error: 'Email is required' }).trim().toLowerCase().email('Invalid email address')
});

export const resetPasswordSchema = z.object({
    token: z.string({ error: 'Reset token is required' }).min(1).max(128).regex(/^[a-f0-9]+$/i),
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Please re-enter your password' })
}).superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
        context.addIssue({
            code: 'custom',
            path: ['confirmPassword'],
            message: 'Passwords do not match'
        });
    }
});
