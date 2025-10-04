// server/premiumNotifications.ts
// Send notifications when premium is about to expire

import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface PremiumNotificationResult {
  notified: number;
  errors: number;
}

export async function sendPremiumExpirationNotifications(): Promise<PremiumNotificationResult> {
  console.log('📧 Checking for premium expiration notifications...');
  
  let notified = 0;
  let errors = 0;
  
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Find users whose premium expires in 7 days or less
    const expiringUsers = await db
      .select()
      .from(users)
      .where(
        sql`${users.premiumTier} != 'none' 
        AND ${users.premiumEndDate} IS NOT NULL
        AND ${users.premiumEndDate} > ${now}
        AND ${users.premiumEndDate} <= ${sevenDaysFromNow}`
      );
    
    console.log(`Found ${expiringUsers.length} users with expiring premium`);
    
    // Create notifications for each user
    for (const user of expiringUsers) {
      try {
        const daysRemaining = Math.ceil(
          (new Date(user.premiumEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Create notification
        await db.execute(sql`
          INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
          VALUES (
            ${user.id},
            'premium_expiring',
            'Premium подписка истекает',
            ${`Ваша ${user.premiumTier} подписка истекает через ${daysRemaining} ${daysRemaining === 1 ? 'день' : daysRemaining < 5 ? 'дня' : 'дней'}. Продлите её, чтобы не потерять преимущества!`},
            ${JSON.stringify({ tier: user.premiumTier, daysRemaining })},
            false,
            NOW()
          )
          ON CONFLICT DO NOTHING
        `);
        
        console.log(`✅ Notification sent to ${user.username} (${daysRemaining} days remaining)`);
        notified++;
        
        // TODO: Send Telegram notification if user has Telegram linked
        if (user.telegramChatId) {
          // Implement Telegram bot notification here
          console.log(`📱 TODO: Send Telegram notification to ${user.telegramUsername}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to notify user ${user.username}:`, error);
        errors++;
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check premium expiration notifications:', error);
    throw error;
  }
  
  console.log(`✅ Premium notification check complete. Notified: ${notified}, Errors: ${errors}`);
  
  return { notified, errors };
}

// Add to cron job - run once per day
export function startPremiumNotificationCron() {
  console.log('🚀 Starting premium notification cron job...');
  
  // Run immediately on startup
  sendPremiumExpirationNotifications().catch(console.error);
  
  // Then run once per day at 10 AM
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    sendPremiumExpirationNotifications().catch(console.error);
  }, DAY_IN_MS);
}