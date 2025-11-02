import { db } from './db';
import { users } from '../shared/schema';
import { sql, isNull, isNotNull } from 'drizzle-orm';

async function populateEpicGamesNames() {
  console.log('🔧 Populating epicGamesName for existing users...');

  try {
    // Update all users who have epicGamesId but no epicGamesName
    // Set epicGamesName to their username
    const result = await db
      .update(users)
      .set({
        epicGamesName: sql`username`
      })
      .where(sql`epic_games_id IS NOT NULL AND epic_games_name IS NULL`);

    console.log('✅ Updated users with epicGamesName from username');
    console.log(`   Rows affected: ${result.rowCount || 0}`);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

populateEpicGamesNames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
