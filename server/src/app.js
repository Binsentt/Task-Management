import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { isClientOriginAllowed } from './config/clientOrigins.js';
import authRoutes from './modules/auth/auth.routes.js';
import historyRoutes from './modules/history/history.routes.js';
import organizationRoutes from './modules/organization/organization.routes.js';
import presenceRoutes from './modules/presence/presence.routes.js';
import remoteShiftRoutes from './modules/remoteshift/remoteshift.routes.js';
import taskRoutes from './modules/task/task.routes.js';
import userRoutes from './modules/user/user.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Behind a proxy (Render, Railway, nginx) the real client IP is needed for rate limiting
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(cors({
    origin: (origin, callback) => {
        callback(null, !origin || isClientOriginAllowed(origin));
    },
    credentials: true // required so the browser sends the auth cookie
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    const status = ready ? 200 : 503;
    res.status(status).json({
        status,
        data: { uptime: process.uptime() },
        message: ready ? 'OK' : 'Database unavailable',
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/shifts', remoteShiftRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// Must stay last
app.use(notFound);
app.use(errorHandler);

export default app;
