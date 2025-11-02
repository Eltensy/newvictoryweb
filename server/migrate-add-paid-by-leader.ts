import { db } from './db';
import { sql } from 'drizzle-orm';

async function addPaidByLeaderField() {
  console.log('🔧 Adding paidByLeader field to tournament_team_invites...');

  try {
    // Добавляем поле paidByLeader - флаг, что капитан оплатил вступление
    await db.execute(sql`
      ALTER TABLE tournament_team_invites
      ADD COLUMN IF NOT EXISTS paid_by_leader BOOLEAN DEFAULT false
    `);
    console.log('✅ Added paid_by_leader column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addPaidByLeaderField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
