import 'dotenv/config'; // must be the first import so env vars exist before other modules load
import mongoose from 'mongoose';

// Importing every model registers it and lets Mongoose build its indexes on startup
// (the unique and partial indexes on User, RemoteShift, Organization depend on this)
import './modules/user/user.model.js';
import './modules/organization/organization.model.js';
import './modules/task/task.model.js';
import './modules/remoteshift/remoteshift.model.js';
import './modules/history/history.model.js';

import app from './app.js';
import connectDB from './config/database.js';

const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // close cleanly on Ctrl+C or when the host stops the process
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});