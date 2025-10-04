// server/premiumCron.ts
// This handles automatic premium expiration checks

import { storage } from './storage';
import { sendPremiumExpirationNotifications } from './premiumNotifications';

export async function checkAndExpirePremiums(): Promise<{ expired: number; checked: number }> {
  console.log('🔍 Running premium expiration check...');
  
  try {
    const expiredCount = await storage.expireOldPremiums();
    
    console.log(`✅ Premium expiration check complete. Expired: ${expiredCount}`);
    
    return {
      expired: expiredCount,
      checked: Date.now()
    };
  } catch (error) {
    console.error('❌ Premium expiration check failed:', error);
    throw error;
  }
}

// Run check every hour
export function startPremiumCronJob() {
  console.log('🚀 Starting premium expiration cron job...');
  
  // Run immediately on startup
  checkAndExpirePremiums().catch(console.error);
  
  // Run notification check on startup
  sendPremiumExpirationNotifications().catch(console.error);
  
  // Then run expiration check every hour
  const HOUR_IN_MS = 60 * 60 * 1000;
  setInterval(() => {
    checkAndExpirePremiums().catch(console.error);
  }, HOUR_IN_MS);
  
  // Run notification check once per day
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    sendPremiumExpirationNotifications().catch(console.error);
  }, DAY_IN_MS);
}

// For manual triggering (e.g., from admin endpoint)
export async function manualPremiumCheck(): Promise<{ expired: number; checked: number }> {
  console.log('🔧 Manual premium expiration check triggered');
  return await checkAndExpirePremiums();
}