import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './db';
import { startServer } from './server';
import crypto from 'node:crypto';
import 'dotenv/config';

// @ts-ignore
globalThis.crypto = crypto;

(async () => {
  await migrate(db, {
    migrationsFolder: 'drizzle',
  });

  startServer();
})();
