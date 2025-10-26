// server/migrations/20251026_fix_reward_validation.ts
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION: Fix Reward Validation (Allow 0 Rewards)');
  console.log('='.repeat(70) + '\n');

  try {
    // ===== STEP 1: CHECK CURRENT CONSTRAINT =====
    console.log('Step 1: Checking current reward column constraints...');
    
    const columnCheck = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'submissions'
        AND column_name = 'reward';
    `);
    
    if (columnCheck.rows.length > 0) {
      const col = columnCheck.rows[0];
      console.log(`  Current reward column: ${col.data_type}, nullable: ${col.is_nullable}`);
    } else {
      console.log('  ⚠ Reward column not found');
    }

    // ===== STEP 2: REMOVE OLD CHECK CONSTRAINT IF EXISTS =====
    console.log('\nStep 2: Removing old positive-only check constraint...');
    
    await db.execute(sql`
      ALTER TABLE submissions 
      DROP CONSTRAINT IF EXISTS submissions_reward_check;
    `);
    console.log('  ✓ Old constraint removed');

    await db.execute(sql`
      ALTER TABLE submissions 
      DROP CONSTRAINT IF EXISTS submissions_reward_positive;
    `);
    console.log('  ✓ Legacy constraint removed');

    // ===== STEP 3: ADD NEW CONSTRAINT (>= 0) =====
    console.log('\nStep 3: Adding new constraint (reward >= 0)...');
    
    await db.execute(sql`
      ALTER TABLE submissions 
      ADD CONSTRAINT submissions_reward_non_negative 
      CHECK (reward IS NULL OR reward >= 0);
    `);
    console.log('  ✓ New constraint added: reward >= 0');

    // ===== STEP 4: VERIFY EXISTING DATA =====
    console.log('\nStep 4: Verifying existing submissions...');
    
    const negativeRewards = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM submissions
      WHERE reward < 0;
    `);
    
    const negCount = negativeRewards.rows[0]?.count || 0;
    if (negCount > 0) {
      console.log(`  ⚠ WARNING: Found ${negCount} submissions with negative rewards`);
      console.log('  These should be reviewed and corrected');
    } else {
      console.log('  ✓ No negative rewards found');
    }

    const zeroRewards = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM submissions
      WHERE reward = 0 AND status = 'approved';
    `);
    
    const zeroCount = zeroRewards.rows[0]?.count || 0;
    console.log(`  ℹ Found ${zeroCount} approved submissions with 0 reward`);

    const positiveRewards = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM submissions
      WHERE reward > 0 AND status = 'approved';
    `);
    
    const posCount = positiveRewards.rows[0]?.count || 0;
    console.log(`  ℹ Found ${posCount} approved submissions with positive rewards`);

    // ===== STEP 5: VERIFICATION =====
    console.log('\nStep 5: Verifying constraint...');
    
    const constraintCheck = await db.execute(sql`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'submissions_reward_non_negative';
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('\n📊 Active constraint:');
      constraintCheck.rows.forEach((row: any) => {
        console.log(`  ✓ ${row.constraint_name}`);
        console.log(`    ${row.definition}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(70) + '\n');
    console.log('Changes made:');
    console.log('  ✓ Removed old positive-only constraint');
    console.log('  ✓ Added new constraint: reward >= 0');
    console.log('  ✓ Zero rewards are now allowed for approved submissions');
    console.log('\nNext steps:');
    console.log('  1. Schema validation updated in code');
    console.log('  2. Admins can now approve submissions with 0₽ reward');
    console.log('  3. Useful for non-commercial categories (funny, etc.)');
    console.log('');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

// Run migration
runMigration();