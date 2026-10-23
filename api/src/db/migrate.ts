import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool';

export async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema is up to date.');
}

if (require.main === module) {
  runMigrations()
    .catch((error: unknown) => {
      console.error('Database migration failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => pool.end());
}
