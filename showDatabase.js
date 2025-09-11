import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './shared/schema.ts'; // твой файл с таблицами

// Настройка подключения с SSL для Render
const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Render требует SSL, но можно без проверки сертификата
  },
});

const db = drizzle(pool);

async function showDatabase() {
  try {
    console.log('=== USERS ===');
    const users = await db.select().from(schema.users);
    console.table(users);

    console.log('=== SUBMISSIONS ===');
    const submissions = await db.select().from(schema.submissions);
    console.table(submissions);

    console.log('=== ADMIN ACTIONS ===');
    const actions = await db.select().from(schema.adminActions);
    console.table(actions);

  } catch (err) {
    console.error('Error fetching database:', err);
  } finally {
    await pool.end();
  }
}

showDatabase();
