import { createServer } from 'node:http';
import mongoose from 'mongoose';
import './modules/user/user.model.js';
import './modules/organization/organization.model.js';
import './modules/task/task.model.js';
import './modules/remoteshift/remoteshift.model.js';
import './modules/history/history.model.js';
import './modules/presence/presence.model.js';
import app from './app.js';
import connectDB from './config/database.js';
import { attachRealtime } from './realtime/websocket.js';

export async function startBackend({
    port,
    host = '0.0.0.0',
    connect = connectDB,
    disconnect = () => mongoose.disconnect(),
    shutdownTimeoutMs = 10000,
}) {
    try {
        await connect();
    } catch (error) {
        await disconnect().catch(() => {});
        throw error;
    }
    const server = createServer(app);
    const realtime = attachRealtime(server);
    try {
        await new Promise((resolve, reject) => {
            const failed = (error) => reject(error);
            server.once('error', failed);
            server.listen(port, host, () => {
                server.off('error', failed);
                resolve();
            });
        });
    } catch (error) {
        realtime.close();
        await disconnect().catch(() => {});
        throw error;
    }

    let stopping;
    function stop() {
        if (stopping) return stopping;
        stopping = new Promise((resolve, reject) => {
            const deadline = setTimeout(() => {
                server.closeAllConnections?.();
                reject(new Error('Backend shutdown timed out'));
            }, shutdownTimeoutMs);
            deadline.unref();
            (async () => {
                try {
                    await realtime.close();
                    await new Promise((done, fail) => server.close((error) => {
                        if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') fail(error);
                        else done();
                    }));
                    await disconnect();
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    clearTimeout(deadline);
                }
            })();
        });
        return stopping;
    }
    return { server, stop };
}
