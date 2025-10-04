// server/migrate-oauth-premium.ts
// Run with: npx tsx server/migrate-oauth-premium.ts

import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('OAuth & Premium System Migration');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Add Discord OAuth columns
    console.log('[1/8] Adding Discord OAuth columns...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS discord_username TEXT,
      ADD COLUMN IF NOT EXISTS discord_email TEXT,
      ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
    `);
    console.log('      ✓ Discord columns added\n');
    
    // Step 2: Add Telegram OAuth columns
    console.log('[2/8] Adding Telegram OAuth columns...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
      ADD COLUMN IF NOT EXISTS telegram_username TEXT,
      ADD COLUMN IF NOT EXISTS telegram_first_name TEXT,
      ADD COLUMN IF NOT EXISTS telegram_last_name TEXT,
      ADD COLUMN IF NOT EXISTS telegram_photo_url TEXT;
    `);
    console.log('      ✓ Telegram columns added\n');
    
    // Step 3: Add Premium system columns
    console.log('[3/8] Adding Premium system columns...');
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'premium_tier') THEN
          CREATE TYPE premium_tier AS ENUM ('none', 'basic', 'gold', 'platinum', 'vip');
        END IF;
      END $$;
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS premium_tier premium_tier DEFAULT 'none' NOT NULL,
      ADD COLUMN IF NOT EXISTS premium_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS premium_end_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS premium_auto_renew BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS premium_source VARCHAR(50),
      ADD COLUMN IF NOT EXISTS premium_external_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS premium_last_checked TIMESTAMP,
      ADD COLUMN IF NOT EXISTS premium_gifted_by UUID REFERENCES users(id);
    `);
    console.log('      ✓ Premium columns added\n');
    
    // Step 4: Create premium_history table
    console.log('[4/8] Creating premium_history table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS premium_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier premium_tier NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        source VARCHAR(50) NOT NULL,
        granted_by UUID REFERENCES users(id),
        reason TEXT,
        auto_renewed BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('      ✓ premium_history table created\n');
    
    // Step 5: Create indexes for performance
    console.log('[5/8] Creating performance indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
      CREATE INDEX IF NOT EXISTS idx_users_premium_tier ON users(premium_tier);
      CREATE INDEX IF NOT EXISTS idx_users_premium_end_date ON users(premium_end_date);
      CREATE INDEX IF NOT EXISTS idx_premium_history_user_id ON premium_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_premium_history_created_at ON premium_history(created_at DESC);
    `);
    console.log('      ✓ Indexes created\n');
    
    // Step 6: Create triggers for premium expiration
    console.log('[6/8] Creating premium expiration trigger...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION check_premium_expiration()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.premium_end_date IS NOT NULL AND NEW.premium_end_date < NOW() THEN
          NEW.premium_tier := 'none';
          NEW.premium_start_date := NULL;
          NEW.premium_end_date := NULL;
          NEW.premium_auto_renew := false;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS trigger_check_premium_expiration ON users;
      
      CREATE TRIGGER trigger_check_premium_expiration
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION check_premium_expiration();
    `);
    console.log('      ✓ Expiration trigger created\n');
    
    // Step 7: Create useful views
    console.log('[7/8] Creating database views...');
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_premium_users AS
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.premium_tier,
        u.premium_start_date,
        u.premium_end_date,
        u.premium_auto_renew,
        u.premium_source,
        CASE 
          WHEN u.premium_end_date IS NULL THEN false
          WHEN u.premium_end_date > NOW() THEN true
          ELSE false
        END as is_active,
        CASE 
          WHEN u.premium_end_date IS NULL THEN 0
          ELSE GREATEST(0, EXTRACT(DAY FROM (u.premium_end_date - NOW())))::INTEGER
        END as days_remaining,
        gifter.username as gifted_by_username,
        u.created_at
      FROM users u
      LEFT JOIN users gifter ON u.premium_gifted_by::text = gifter.id::text
      WHERE u.premium_tier != 'none'
      ORDER BY u.premium_end_date DESC NULLS LAST;
      
      CREATE OR REPLACE VIEW v_oauth_status AS
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.discord_id IS NOT NULL as has_discord,
        u.discord_username,
        u.telegram_chat_id IS NOT NULL as has_telegram,
        u.telegram_username,
        u.created_at
      FROM users u;
    `);
    console.log('      ✓ Views created\n');
    
    // Step 8: Verify migration
    console.log('[8/8] Verifying migration...');
    
    const discordColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name LIKE 'discord_%';
    `);
    
    const telegramColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name LIKE 'telegram_%';
    `);
    
    const premiumColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name LIKE 'premium_%';
    `);
    
    const historyTable = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'premium_history'
      );
    `);
    
    const indexes = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'premium_history')
        AND indexname LIKE 'idx_%discord%' 
         OR indexname LIKE 'idx_%telegram%'
         OR indexname LIKE 'idx_%premium%';
    `);
    
    const triggers = await db.execute(sql`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'users'
        AND trigger_name LIKE '%premium%';
    `);
    
    const views = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('v_premium_users', 'v_oauth_status');
    `);
    
    console.log('\n      Migration Verification Results:');
    console.log('      ─────────────────────────────────────');
    console.log(`      ✓ Discord columns: ${discordColumns.rows.length}/4`);
    console.log(`      ✓ Telegram columns: ${telegramColumns.rows.length}/5`);
    console.log(`      ✓ Premium columns: ${premiumColumns.rows.length}/8`);
    console.log(`      ✓ premium_history table: ${historyTable.rows[0]?.exists ? 'EXISTS' : 'MISSING'}`);
    console.log(`      ✓ Indexes created: ${indexes.rows.length}`);
    console.log(`      ✓ Triggers created: ${triggers.rows.length}`);
    console.log(`      ✓ Views created: ${views.rows.length}`);
    
    if (discordColumns.rows.length >= 4 && 
        telegramColumns.rows.length >= 5 && 
        premiumColumns.rows.length >= 8 &&
        historyTable.rows[0]?.exists) {
      console.log('\n' + '='.repeat(60));
      console.log('MIGRATION COMPLETED SUCCESSFULLY ✓');
      console.log('='.repeat(60));
      console.log('\nOAuth & Premium system is now ready!\n');
      console.log('Key Features:');
      console.log('  • Discord OAuth integration');
      console.log('  • Telegram OAuth integration');
      console.log('  • Premium tier system (none/basic/gold/platinum/vip)');
      console.log('  • Premium history tracking');
      console.log('  • Automatic expiration handling\n');
      console.log('Environment Variables Required:');
      console.log('  DISCORD_CLIENT_ID=...');
      console.log('  DISCORD_CLIENT_SECRET=...');
      console.log('  DISCORD_REDIRECT_URI=http://localhost:5000/api/auth/discord/callback');
      console.log('  TELEGRAM_BOT_TOKEN=...');
      console.log('  TELEGRAM_BOT_USERNAME=...\n');
      console.log('Next steps:');
      console.log('  1. Set up environment variables');
      console.log('  2. Restart your server');
      console.log('  3. Test Discord OAuth flow');
      console.log('  4. Test Telegram OAuth flow');
      console.log('  5. Test premium grant/revoke\n');
      
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
    console.error('\nPlease check the error and try again.');
    console.error('You may need to manually rollback changes.\n');
    process.exit(1);
  }
}

// Run migration
console.log('Starting OAuth & Premium migration...');
runMigration();