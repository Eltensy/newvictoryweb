import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './shared/schema.ts';
import { eq } from "drizzle-orm";


const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: {
    rejectUnauthorized: false, 
  },
});

const db = drizzle(pool);

async function showDatabase() {
  try {
    //console.log('=== USERS ===');
    //const users = await db.select().from(schema.users);
    //console.table(users);

    console.log('=== SUBMISSIONS ===');
    const submissions = await db.select().from(schema.submissions);
    console.table(submissions);

    console.log('=== ADMIN ACTIONS ===');
    const actions = await db.select().from(schema.adminActions);
    console.table(actions);

    console.log('=== MAPS ===');
    const maps = await db.select().from(schema.territories);
    console.table(maps);

    console.log('=== TERR ===');
    const territory_templates = await db.select().from(schema.territory_templates);
    console.table(territory_templates);
  } catch (err) {
    console.error('Error fetching database:', err);
  } finally {
    await pool.end();
  }
}

async function updateUser() {
  try {
    const result = await db
      .update(schema.users)
      .set({ isAdmin: true })
      .where(eq(schema.users.id, '07bf3a42-032c-40c6-9e2d-955f45fd4a87'))
      .returning();

    console.log("Updated rows:");
    console.table(result);
  } catch (err) {
    console.error("Error updating user:", err);
  } finally {
    await pool.end();
  }
}

async function dropTerritoryTemplatesTable() {
  try {
    console.log('Dropping territory_templates table...');
    
    // Выполняем raw SQL запрос для удаления таблицы
    await pool.query('DROP TABLE IF EXISTS territory_templates CASCADE');
    
    console.log('Successfully dropped territory_templates table');
  } catch (err) {
    console.error('Error dropping territory_templates table:', err);
  } finally {
    await pool.end();
  }
}


dropTerritoryTemplatesTable();

showDatabase();
