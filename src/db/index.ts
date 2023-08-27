import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const sqlite = createClient({
  url: 'file:local.db',
});

export const db = drizzle(sqlite);
