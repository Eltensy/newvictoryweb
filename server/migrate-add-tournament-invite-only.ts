import { db } from './db';
import { sql } from 'drizzle-orm';

async function addTournamentInviteOnlyField() {
  console.log('🔧 Adding is_invite_only field to tournaments table...');

  try {
    await db.execute(sql`
      ALTER TABLE tournaments
      ADD COLUMN IF NOT EXISTS is_invite_only BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Added is_invite_only column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addTournamentInviteOnlyField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
