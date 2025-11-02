import { db } from './db';
import { sql } from 'drizzle-orm';

async function addTeamFieldsToEligiblePlayers() {
  console.log('🔧 Adding teamId and isTeamLeader fields to dropmap_eligible_players...');

  try {
    // Добавляем поле teamId
    await db.execute(sql`
      ALTER TABLE dropmap_eligible_players
      ADD COLUMN IF NOT EXISTS team_id TEXT
    `);
    console.log('✅ Added team_id column');

    // Добавляем поле isTeamLeader
    await db.execute(sql`
      ALTER TABLE dropmap_eligible_players
      ADD COLUMN IF NOT EXISTS is_team_leader BOOLEAN DEFAULT false
    `);
    console.log('✅ Added is_team_leader column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addTeamFieldsToEligiblePlayers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
