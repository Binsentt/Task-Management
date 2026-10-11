import { z } from 'zod';

// Same pattern as auth.validation.js: zod cleans the body and drops unknown fields,
// so fields like created_by, organization, completed_at or deleted_at can never come from the client.

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const checklistItem = z.object({
    _id: objectId.optional(), // send the existing _id to keep an item, omit it for a new one
    text: z.string().trim().min(1, 'Checklist text is required').max(200, 'Checklist text is too long'),
    isDone: z.boolean().optional(),
    order: z.number().int().optional()
});

const fields = {
    title: z
        .string({ error: 'Title is required' })
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(120, 'Title must be at most 120 characters'),
    content: z.string().trim().max(5000, 'Content is too long'),
    status: z.enum(['TO_DO', 'IN_PROGRESS', 'DONE']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    deadline: z.coerce.date({ error: 'Invalid deadline' }).nullable(),
    checklist: z.array(checklistItem).max(100, 'A task can have at most 100 checklist items'),
    assigned_to: objectId.nullable()
};

// POST /api/tasks
export const createTaskSchema = z.object({
    title: fields.title,
    content: fields.content.optional(),
    status: fields.status.optional(),
    priority: fields.priority.optional(),
    deadline: fields.deadline.optional(),
    checklist: fields.checklist.optional(),
    assigned_to: fields.assigned_to.optional(),
    is_org_task: z.boolean().optional() // true = create inside your organization
});

// PATCH /api/tasks/:id, every field optional, send only what changed
export const updateTaskSchema = z.object({
    title: fields.title.optional(),
    content: fields.content.optional(),
    status: fields.status.optional(),
    priority: fields.priority.optional(),
    deadline: fields.deadline.optional(),
    checklist: fields.checklist.optional(),
    assigned_to: fields.assigned_to.optional()
});