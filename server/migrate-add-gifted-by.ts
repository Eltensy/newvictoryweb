import { db } from './db';
import { sql } from 'drizzle-orm';

async function addGiftedByField() {
  console.log('🔧 Adding giftedBy field to tournament_registrations...');

  try {
    // Добавляем поле giftedBy - ID пользователя, который подарил регистрацию
    await db.execute(sql`
      ALTER TABLE tournament_registrations
      ADD COLUMN IF NOT EXISTS gifted_by TEXT REFERENCES users(id)
    `);
    console.log('✅ Added gifted_by column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addGiftedByField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
