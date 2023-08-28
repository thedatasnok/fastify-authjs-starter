import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import crypto from 'node:crypto';
import { db } from './db';

// @ts-ignore
globalThis.crypto = crypto;

(async () => {
  await migrate(db, {
    migrationsFolder: 'drizzle',
  });

  // dynamic import to allow dotenv to load before anything is processed further
  (await import('./server')).startServer();
})();
