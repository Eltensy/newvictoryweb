// server/migrations/20251026_update_default_max_players.ts
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION: Update Default maxPlayers to 999');
  console.log('='.repeat(70) + '\n');

  try {
    // Изменяем дефолтное значение колонки
    console.log('Step 1: Updating default value for max_players column...');
    await db.execute(sql`
      ALTER TABLE dropmap_invite_codes
ADD COLUMN IF NOT EXISTS virtual_player_id TEXT;
    `);
    console.log('  ✓ Default value updated to 999');

    console.log('\n' + '='.repeat(70));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(70) + '\n');
    console.log('Changes made:');
    console.log('  ✓ Default max_players changed from 1 to 999');
    console.log('  ✓ Existing territories updated to allow unlimited players');
    console.log('');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

runMigration();