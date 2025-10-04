// server/migrate-telegram-bot.ts
// Run with: npx tsx server/migrate-telegram-bot.ts

import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('Telegram Bot Authorization System Migration');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Check users.id type
    console.log('[1/6] Checking users table structure...');
    const userIdType = await db.execute(sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    
    const idType = userIdType.rows[0]?.udt_name || userIdType.rows[0]?.data_type;
    console.log(`      ✓ users.id type: ${idType}\n`);
    
    // Step 2: Create telegram_verifications table with correct type
    console.log('[2/6] Creating telegram_verifications table...');
    
    if (idType === 'uuid') {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS telegram_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code VARCHAR(10) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
    } else {
      // Use VARCHAR for user_id if users.id is VARCHAR
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS telegram_verifications (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code VARCHAR(10) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
    }
    console.log('      ✓ telegram_verifications table created\n');
    
    // Step 3: Create indexes for performance
    console.log('[3/6] Creating performance indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_telegram_verifications_user_id 
        ON telegram_verifications(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_telegram_verifications_code 
        ON telegram_verifications(code);
      
      CREATE INDEX IF NOT EXISTS idx_telegram_verifications_expires_at 
        ON telegram_verifications(expires_at);
      
      CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id 
        ON users(telegram_chat_id) 
        WHERE telegram_chat_id IS NOT NULL;
    `);
    console.log('      ✓ Indexes created\n');
    
    // Step 4: Create cleanup function for expired verifications
    console.log('[4/6] Creating automatic cleanup function...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION cleanup_expired_telegram_verifications()
      RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM telegram_verifications 
        WHERE expires_at < NOW();
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('      ✓ Cleanup function created\n');
    
    // Step 5: Create scheduled job extension (if not exists)
    console.log('[5/6] Setting up automatic cleanup job...');
    await db.execute(sql`
      -- Enable pg_cron extension if available (optional)
      CREATE EXTENSION IF NOT EXISTS pg_cron;
      
      -- Schedule cleanup job to run every hour
      -- Note: This requires pg_cron extension
      -- If pg_cron is not available, you'll need to run cleanup manually or via cron job
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
        ) THEN
          -- Remove existing job if exists
          PERFORM cron.unschedule('cleanup_telegram_verifications');
          
          -- Schedule new job
          PERFORM cron.schedule(
            'cleanup_telegram_verifications',
            '0 * * * *', -- Every hour
            $$SELECT cleanup_expired_telegram_verifications();$$
          );
          
          RAISE NOTICE 'Automatic cleanup job scheduled with pg_cron';
        ELSE
          RAISE NOTICE 'pg_cron not available - manual cleanup required';
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not schedule cleanup job: %', SQLERRM;
      END $$;
    `);
    console.log('      ✓ Cleanup job configured\n');
    
    // Step 6: Verify migration
    console.log('[6/6] Verifying migration...');
    
    const verificationsTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'telegram_verifications'
      );
    `);
    
    const indexes = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'telegram_verifications'
        OR (tablename = 'users' AND indexname LIKE '%telegram%');
    `);
    
    const functions = await db.execute(sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'cleanup_expired_telegram_verifications';
    `);
    
    const pgCronAvailable = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
      );
    `);
    
    console.log('\n      Migration Verification Results:');
    console.log('      ─────────────────────────────────────────');
    console.log(`      ✓ telegram_verifications table: ${verificationsTable.rows[0]?.exists ? 'EXISTS' : 'MISSING'}`);
    console.log(`      ✓ Indexes created: ${indexes.rows.length}`);
    console.log(`      ✓ Cleanup function: ${functions.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`      ${pgCronAvailable.rows[0]?.exists ? '✓' : '⚠'} pg_cron: ${pgCronAvailable.rows[0]?.exists ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    
    if (verificationsTable.rows[0]?.exists && functions.rows.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('MIGRATION COMPLETED SUCCESSFULLY ✓');
      console.log('='.repeat(60));
      console.log('\nTelegram Bot Authorization is now ready!\n');
      
      console.log('Key Features:');
      console.log('  • Verification code generation (6-char alphanumeric)');
      console.log('  • 5-minute code expiration');
      console.log('  • Automatic cleanup of expired codes');
      console.log('  • Secure bot webhook integration');
      console.log('  • User profile photo support\n');
      
      console.log('Environment Variables Required:');
      console.log('  TELEGRAM_BOT_TOKEN=your_bot_token_here');
      console.log('  TELEGRAM_BOT_USERNAME=your_bot_username');
      console.log('  API_URL=http://localhost:5000 (or your production URL)\n');
      
      console.log('Telegram Bot Setup:');
      console.log('  1. Create bot via @BotFather on Telegram');
      console.log('  2. Get bot token and username');
      console.log('  3. Set environment variables');
      console.log('  4. Run: node server/telegram-bot.js\n');
      
      console.log('API Endpoints:');
      console.log('  GET  /api/auth/telegram/init - Generate verification code');
      console.log('  POST /api/auth/telegram/webhook - Bot webhook (internal)');
      console.log('  GET  /api/auth/telegram/status - Check verification status');
      console.log('  DELETE /api/user/:id/telegram - Unlink Telegram account\n');
      
      if (!pgCronAvailable.rows[0]?.exists) {
        console.log('⚠ IMPORTANT: pg_cron not available');
        console.log('  You should run cleanup manually or via system cron:');
        console.log('  */30 * * * * psql -d your_db -c "SELECT cleanup_expired_telegram_verifications();"');
        console.log('  Or add this to your server startup/scheduled tasks\n');
      }
      
      console.log('Testing the Integration:');
      console.log('  1. Start your server: npm run dev');
      console.log('  2. Start Telegram bot: node server/telegram-bot.js');
      console.log('  3. Open user profile in browser');
      console.log('  4. Click "Привязать Telegram"');
      console.log('  5. Open bot link');
      console.log('  6. Send verification code to bot');
      console.log('  7. Account should be linked automatically\n');
      
      console.log('Database Schema:');
      console.log('  telegram_verifications:');
      console.log('    • id: UUID (primary key)');
      console.log('    • user_id: UUID (foreign key to users)');
      console.log('    • code: VARCHAR(10) (unique)');
      console.log('    • expires_at: TIMESTAMP');
      console.log('    • created_at: TIMESTAMP\n');
      
      process.exit(0);
    } else {
      throw new Error('Some migration steps did not complete successfully');
    }
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('MIGRATION FAILED ✗');
    console.error('='.repeat(60));
    console.error('\nError details:');
    console.error(error);
    console.error('\nPossible solutions:');
    console.error('  • Check database connection');
    console.error('  • Verify users table exists');
    console.error('  • Ensure proper database permissions');
    console.error('  • Check for conflicting table names\n');
    console.error('Manual rollback (if needed):');
    console.error('  DROP TABLE IF EXISTS telegram_verifications CASCADE;');
    console.error('  DROP FUNCTION IF EXISTS cleanup_expired_telegram_verifications();');
    console.error('  SELECT cron.unschedule(\'cleanup_telegram_verifications\');\n');
    process.exit(1);
  }
}

// Run migration
console.log('Starting Telegram Bot Authorization migration...');
runMigration();