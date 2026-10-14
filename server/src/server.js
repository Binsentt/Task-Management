import 'dotenv/config'; // must be the first import so env vars exist before other modules load
import { validateEnvironment } from './config/env.js';
import { safeErrorMessage } from './utils/safeError.js';

async function start() {
  const { port } = validateEnvironment();
  const { startBackend } = await import('./runtime.js');
  const backend = await startBackend({ port });
  console.log(`Server listening on 0.0.0.0:${port}`);
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    try {
      await backend.stop();
      process.exit(0);
    } catch (error) {
      console.error('Failed to shut down server:', safeErrorMessage(error));
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  backend.server.on('error', (error) => {
    console.error('HTTP server error:', safeErrorMessage(error));
    backend.stop().finally(() => process.exit(1));
  });
}

start().catch((error) => {
  console.error('Failed to start server:', safeErrorMessage(error));
  process.exit(1);
});
