// server/migrations/add-custom-name-to-dropmap.ts
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('Adding custom_name to drop_map_settings');
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('[1/1] Adding custom_name column...');
    await db.execute(sql`
      ALTER TABLE drop_map_settings 
      ADD COLUMN IF NOT EXISTS custom_name TEXT;
    `);
    console.log('      ✓ Column added\n');
    
    console.log('='.repeat(60));
    console.log('MIGRATION COMPLETED SUCCESSFULLY ✓');
    console.log('='.repeat(60));
    console.log('\nAdded column:');
    console.log('  ✓ custom_name (TEXT) to drop_map_settings\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('MIGRATION FAILED ✗');
    console.error('='.repeat(60));
    console.error('\nError:', error);
    process.exit(1);
  }
}

console.log('Starting migration...');
runMigration();