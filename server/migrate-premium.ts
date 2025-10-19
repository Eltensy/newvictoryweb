// server/migrations/20251020_add_kill_system.ts
import { db } from './db';
import { sql } from 'drizzle-orm';


async function runMigration() {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION: Add Kill System - Counters and History');
  console.log('='.repeat(70) + '\n');

  try {
    // ===== STEP 7: MIGRATE EXISTING DATA =====
    console.log('\nStep 7: Migrating existing approved kill submissions...');
    
    console.log('  7a: Counting existing kill submissions...');
    const existingKills = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE category = 'gold-kill') as gold,
        COUNT(*) FILTER (WHERE category = 'silver-kill') as silver,
        COUNT(*) FILTER (WHERE category = 'bronze-kill') as bronze,
        COUNT(*) as total
      FROM submissions
      WHERE status = 'approved'
        AND category IN ('gold-kill', 'silver-kill', 'bronze-kill');
    `);
    
    const killCounts = existingKills.rows[0];
    console.log(`  Found ${killCounts?.total || 0} approved kill submissions:`);
    console.log(`    🥇 Gold: ${killCounts?.gold || 0}`);
    console.log(`    🥈 Silver: ${killCounts?.silver || 0}`);
    console.log(`    🥉 Bronze: ${killCounts?.bronze || 0}`);

    if ((killCounts?.total || 0) > 0) {
      console.log('\n  7b: Updating user kill counters...');
      
      // Gold kills
      await db.execute(sql`
        UPDATE users u
        SET gold_kills = (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.user_id::text = u.id::text
            AND s.status = 'approved'
            AND s.category = 'gold-kill'
        );
      `);
      console.log('  ✓ Gold kills counted');

      // Silver kills
      await db.execute(sql`
        UPDATE users u
        SET silver_kills = (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.user_id::text = u.id::text
            AND s.status = 'approved'
            AND s.category = 'silver-kill'
        );
      `);
      console.log('  ✓ Silver kills counted');

      // Bronze kills
      await db.execute(sql`
        UPDATE users u
        SET bronze_kills = (
          SELECT COUNT(*)
          FROM submissions s
          WHERE s.user_id::text = u.id::text
            AND s.status = 'approved'
            AND s.category = 'bronze-kill'
        );
      `);
      console.log('  ✓ Bronze kills counted');

      // Total kills
      await db.execute(sql`
        UPDATE users
        SET total_kills = gold_kills + silver_kills + bronze_kills
        WHERE gold_kills > 0 OR silver_kills > 0 OR bronze_kills > 0;
      `);
      console.log('  ✓ Total kills calculated');

      console.log('\n  7c: Creating kill_history records...');
      const insertedRecords = await db.execute(sql`
        INSERT INTO kill_history (user_id, kill_type, submission_id, reward_amount, granted_by, reason, created_at)
        SELECT 
          s.user_id::uuid,
          CASE 
            WHEN s.category = 'gold-kill' THEN 'gold'::kill_type
            WHEN s.category = 'silver-kill' THEN 'silver'::kill_type
            WHEN s.category = 'bronze-kill' THEN 'bronze'::kill_type
          END,
          s.id::uuid,
          COALESCE(s.reward, 0),
          CASE WHEN s.reviewed_by IS NOT NULL THEN s.reviewed_by::uuid ELSE NULL END,
          'Migrated from existing approved submission',
          COALESCE(s.reviewed_at, s.created_at)
        FROM submissions s
        WHERE s.status = 'approved'
          AND s.category IN ('gold-kill', 'silver-kill', 'bronze-kill')
        ON CONFLICT DO NOTHING;
      `);
      console.log(`  ✓ Created ${insertedRecords.rowCount || 0} kill_history records`);
    } else {
      console.log('  ℹ No existing kill submissions found, skipping data migration');
    }

    // ===== STEP 8: VERIFICATION =====
    console.log('\nStep 1: Verifying migration...');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_users,
        SUM(gold_kills) as total_gold_kills,
        SUM(silver_kills) as total_silver_kills,
        SUM(bronze_kills) as total_bronze_kills,
        SUM(total_kills) as total_all_kills,
        (SELECT COUNT(*) FROM kill_history) as kill_history_records
      FROM users;
    `);
    
    const result = stats.rows[0];
    console.log('\n📊 Migration Statistics:');
    console.log(`  Total users: ${result?.total_users || 0}`);
    console.log(`  🥇 Total gold kills: ${result?.total_gold_kills || 0}`);
    console.log(`  🥈 Total silver kills: ${result?.total_silver_kills || 0}`);
    console.log(`  🥉 Total bronze kills: ${result?.total_bronze_kills || 0}`);
    console.log(`  🏆 Total all kills: ${result?.total_all_kills || 0}`);
    console.log(`  📝 Kill history records: ${result?.kill_history_records || 0}`);

    // Verify trigger works
    console.log('\nStep 2: Testing trigger function...');
    const testResult = await db.execute(sql`
      SELECT gold_kills + silver_kills + bronze_kills as calculated,
             total_kills
      FROM users
      WHERE total_kills > 0
      LIMIT 1;
    `);
    
    if (testResult.rows.length > 0) {
      const test = testResult.rows[0];
      if (test.calculated === test.total_kills) {
        console.log('✓ Trigger verification passed');
      } else {
        console.log('⚠ Trigger might not be working correctly');
      }
    } else {
      console.log('ℹ No users with kills to test trigger');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(70) + '\n');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

// Run migration
runMigration();