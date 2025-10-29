// server/migrations/migrate-userid-to-text.ts
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION: Change userId columns to TEXT for virtual players');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Изменяем тип user_id в territory_claims
    console.log('Step 1: Updating territory_claims.user_id to TEXT...');
    await db.execute(sql`
      ALTER TABLE territory_claims
        DROP CONSTRAINT IF EXISTS territory_claims_user_id_users_id_fk
    `);
    console.log('  ✓ Dropped foreign key constraint from territory_claims.user_id');

    await db.execute(sql`
      ALTER TABLE territory_claims
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT
    `);
    console.log('  ✓ Changed territory_claims.user_id to TEXT type');

    // 2. Изменяем тип user_id в dropmap_eligible_players
    console.log('\nStep 2: Updating dropmap_eligible_players.user_id to TEXT...');
    await db.execute(sql`
      ALTER TABLE dropmap_eligible_players
        DROP CONSTRAINT IF EXISTS dropmap_eligible_players_user_id_users_id_fk
    `);
    console.log('  ✓ Dropped foreign key constraint from dropmap_eligible_players.user_id');

    await db.execute(sql`
      ALTER TABLE dropmap_eligible_players
        ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT
    `);
    console.log('  ✓ Changed dropmap_eligible_players.user_id to TEXT type');

    console.log('\n' + '='.repeat(70));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(70) + '\n');
    console.log('Changes made:');
    console.log('  ✓ territory_claims.user_id: UUID → TEXT');
    console.log('  ✓ dropmap_eligible_players.user_id: UUID → TEXT');
    console.log('  ✓ Foreign key constraints removed (to allow virtual player IDs)');
    console.log('\nNow virtual players (invites) can be stored alongside real users!');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', (error as Error).stack);
    console.log('\n⚠️  If the error is about missing constraints, that\'s OK - they may not exist.');
    console.log('    The migration will still work correctly.\n');
    process.exit(1);
  }
}

runMigration();
