export const notFound = (req, res) => {
    res.status(404).json({
        status: 404,
        data: null,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
};

// Express recognizes error handlers by their 4 parameters, keep all of them.
// Express 5 forwards errors thrown in async handlers here automatically.
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ status: 400, data: null, message: 'Invalid JSON body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ status: 413, data: null, message: 'Request body too large' });
    }

    console.error(err);
    res.status(500).json({ status: 500, data: null, message: 'Internal server error' });
};