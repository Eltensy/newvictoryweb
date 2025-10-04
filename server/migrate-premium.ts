// server/migrations/fix-additional-text-nullable.ts
// Run with: npx tsx server/migrations/fix-additional-text-nullable.ts

import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('Making additionalText field nullable in submissions');
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('[1/3] Checking current column state...');
    
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'submissions' 
        AND column_name = 'additional_text';
    `);
    
    if (columnInfo.rows.length === 0) {
      console.log('      ⚠ Column not found, creating it...\n');
      
      await db.execute(sql`
        ALTER TABLE submissions 
        ADD COLUMN additional_text TEXT;
      `);
      
      console.log('      ✓ Column created as nullable\n');
    } else {
      const isNullable = columnInfo.rows[0].is_nullable === 'YES';
      console.log(`      Column exists: ${isNullable ? 'NULLABLE ✓' : 'NOT NULL ✗'}\n`);
      
      if (!isNullable) {
        console.log('[2/3] Converting existing data...');
        
        // Update empty strings to NULL
        const updateResult = await db.execute(sql`
          UPDATE submissions 
          SET additional_text = NULL 
          WHERE additional_text = '' OR additional_text = '-';
        `);
        
        console.log(`      ✓ Updated ${updateResult.rowCount || 0} rows\n`);
        
        console.log('[3/3] Dropping NOT NULL constraint...');
        
        await db.execute(sql`
          ALTER TABLE submissions 
          ALTER COLUMN additional_text DROP NOT NULL;
        `);
        
        console.log('      ✓ Column is now nullable\n');
      } else {
        console.log('[2/3] Column is already nullable, cleaning data...');
        
        const updateResult = await db.execute(sql`
          UPDATE submissions 
          SET additional_text = NULL 
          WHERE additional_text = '-';
        `);
        
        console.log(`      ✓ Cleaned ${updateResult.rowCount || 0} rows\n`);
      }
    }
    
    // Verify the change
    console.log('Verifying migration...\n');
    
    const verifyInfo = await db.execute(sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'submissions' 
        AND column_name = 'additional_text';
    `);
    
    const countResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(additional_text) as with_text,
        COUNT(*) - COUNT(additional_text) as null_count
      FROM submissions;
    `);
    
    console.log('      Database State:');
    console.log('      ─────────────────────────────────────────');
    console.log(`      Column: ${verifyInfo.rows[0]?.column_name}`);
    console.log(`      Type: ${verifyInfo.rows[0]?.data_type}`);
    console.log(`      Nullable: ${verifyInfo.rows[0]?.is_nullable}`);
    console.log(`\n      Data Statistics:`);
    console.log(`      ─────────────────────────────────────────`);
    console.log(`      Total submissions: ${countResult.rows[0]?.total || 0}`);
    console.log(`      With text: ${countResult.rows[0]?.with_text || 0}`);
    console.log(`      NULL values: ${countResult.rows[0]?.null_count || 0}`);
    
    if (verifyInfo.rows[0]?.is_nullable === 'YES') {
      console.log('\n' + '='.repeat(60));
      console.log('MIGRATION COMPLETED SUCCESSFULLY ✓');
      console.log('='.repeat(60));
      console.log('\nChanges applied:');
      console.log('  ✓ Database: additional_text is now NULL-able');
      console.log('  ✓ Data cleaned: "-" replaced with NULL\n');
      
      console.log('Next steps:');
      console.log('  1. Update shared/schema.ts:');
      console.log('     additionalText: z.string().nullable().optional()');
      console.log('  2. Restart your server');
      console.log('  3. Test submission without text\n');
      
      console.log('Frontend behavior:');
      console.log('  • Empty field → sends "-"');
      console.log('  • Server converts "-" → NULL');
      console.log('  • Database stores NULL or text\n');
      
      process.exit(0);
    } else {
      throw new Error('Migration verification failed');
    }
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('MIGRATION FAILED ✗');
    console.error('='.repeat(60));
    console.error('\nError:', error);
    console.error('\nManual fix:');
    console.error('  ALTER TABLE submissions ALTER COLUMN additional_text DROP NOT NULL;');
    console.error('  UPDATE submissions SET additional_text = NULL WHERE additional_text = \'-\';\n');
    process.exit(1);
  }
}

console.log('Starting migration...');
runMigration();