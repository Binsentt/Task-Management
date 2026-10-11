// Usage: router.post('/register', validate(registerSchema), register)
// Replaces req.body with the cleaned data (trimmed, lowercased, unknown fields removed)
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            status: 400,
            data: null,
            message: 'Validation failed',
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
};