import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true // required so the browser sends the auth cookie
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    res.json({ status: 200, data: { uptime: process.uptime() }, message: 'OK' });
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