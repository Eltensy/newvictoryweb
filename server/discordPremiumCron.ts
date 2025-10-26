// server/cron/discordPremiumCron.ts

import { discordPremiumService } from './discordPremiumService';

/**
 * Запускает периодическую проверку Discord премиум
 */
export function startDiscordPremiumCron() {
  // Проверка всех пользователей каждые 6 часов
  setInterval(async () => {
    try {
      await discordPremiumService.checkAllDiscordUsers();
    } catch (error) {
      console.error('Discord premium cron error:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 часов

  // Проверка истекающих премиумов каждый час
  setInterval(async () => {
    try {
      await discordPremiumService.checkExpiringDiscordPremiums();
    } catch (error) {
      console.error('Expiring premium cron error:', error);
    }
  }, 60 * 60 * 1000); // 1 час

  console.log('✅ Discord premium cron jobs started');
}