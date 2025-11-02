import { db } from './db';
import { sql } from 'drizzle-orm';

async function addEpicGamesNameField() {
  console.log('🔧 Adding epicGamesName field to users table...');

  try {
    // Добавляем поле epic_games_name для хранения актуального никнейма Epic Games
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS epic_games_name TEXT
    `);
    console.log('✅ Added epic_games_name column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addEpicGamesNameField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
