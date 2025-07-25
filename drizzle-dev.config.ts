import { defineConfig } from 'drizzle-kit';
import * as fs from 'fs';
import * as path from 'path';

// Find the local D1 SQLite file
export function findLocalD1Database() {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

  if (!fs.existsSync(d1Dir)) {
    throw new Error('Local D1 database directory not found. Run "wrangler dev" first.');
  }

  const files = fs.readdirSync(d1Dir);
  const sqliteFile = files.find(f => f.endsWith('.sqlite'));

  if (!sqliteFile) {
    throw new Error('No SQLite file found in local D1 directory');
  }

  return path.join(d1Dir, sqliteFile);
}

export default defineConfig({
  schema: './app/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: findLocalD1Database(),
  }
});
