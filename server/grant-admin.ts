// server/scripts/grant-admin.ts
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function grantAdmin() {
  console.log('\n' + '='.repeat(70));
  console.log('SCRIPT: Grant Admin Rights to User');
  console.log('='.repeat(70) + '\n');

  // 🔧 ЗАМЕНИ ЭТОТ ID НА ID НУЖНОГО ПОЛЬЗОВАТЕЛЯ
  const userId = 'edccedd1-233a-4bbc-afe5-cb49ca6f9dcd'; // Например: '123e4567-e89b-12d3-a456-426614174000'
  
  // Или можно искать по username
  const username = null; // Например: 'player123'

  try {
    let user;

    if (username) {
      console.log(`🔍 Searching for user by username: ${username}...`);
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      user = result[0];
    } else {
      console.log(`🔍 Searching for user by ID: ${userId}...`);
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      user = result[0];
    }

    if (!user) {
      console.error('❌ User not found!');
      console.error('Make sure the user ID or username is correct.');
      process.exit(1);
    }

    console.log(`✓ User found: ${user.username} (${user.displayName})`);
    console.log(`  Current admin status: ${user.isAdmin ? 'YES' : 'NO'}`);

    if (user.isAdmin) {
      console.log('\n⚠️  User already has admin rights!');
      console.log('No changes needed.');
      process.exit(0);
    }

    console.log('\n🔄 Granting admin rights...');
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n' + '='.repeat(70));
    console.log('✓ Admin rights granted successfully!');
    console.log('='.repeat(70) + '\n');
    console.log('User details:');
    console.log(`  ID: ${updatedUser.id}`);
    console.log(`  Username: ${updatedUser.username}`);
    console.log(`  Display Name: ${updatedUser.displayName}`);
    console.log(`  Email: ${updatedUser.email || 'N/A'}`);
    console.log(`  Admin: ${updatedUser.isAdmin ? 'YES ✓' : 'NO'}`);
    console.log(`  Balance: ${updatedUser.balance} ₽`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error granting admin rights:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

grantAdmin();