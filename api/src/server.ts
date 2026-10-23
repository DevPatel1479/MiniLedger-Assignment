import { createApp } from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { runMigrations } from './db/migrate';

async function start(): Promise<void> {
  await runMigrations();
  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`MiniLedger API listening on http://localhost:${env.PORT}`);
    console.log('Mock OTP values are printed in this server terminal.');
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received. Closing MiniLedger API...`);
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  console.error('Failed to start MiniLedger API:', error);
  process.exit(1);
});
