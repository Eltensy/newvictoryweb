// server/services/discordPremiumService.ts

import { db } from "./db";
import { users, premiumHistory } from "@shared/schema";
import { eq, lt, and, isNotNull, sql } from "drizzle-orm";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_PREMIUM_ROLE_ID = process.env.DISCORD_PREMIUM_ROLE_ID;

// Проверка интервала - минимум 1 час между проверками для одного пользователя
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 час

interface DiscordMember {
  user: {
    id: string;
    username: string;
  };
  roles: string[];
}

export class DiscordPremiumService {
  
  /**
   * Проверяет роль премиум у конкретного пользователя Discord
   */
  async checkUserPremiumRole(discordId: string): Promise<boolean> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_PREMIUM_ROLE_ID) {
      console.error('Discord configuration missing');
      return false;
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
        {
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`User ${discordId} not found in guild`);
          return false;
        }
        throw new Error(`Discord API error: ${response.status}`);
      }

      const member: DiscordMember = await response.json();
      const hasPremiumRole = member.roles.includes(DISCORD_PREMIUM_ROLE_ID);
      
      console.log(`Discord user ${discordId} premium role: ${hasPremiumRole}`);
      return hasPremiumRole;
      
    } catch (error) {
      console.error(`Failed to check Discord role for ${discordId}:`, error);
      return false;
    }
  }

  /**
   * Обновляет премиум статус пользователя на основе Discord роли
   */
  async updateUserPremiumFromDiscord(userId: string): Promise<void> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0] || !user[0].discordId) {
      console.log(`User ${userId} has no Discord linked`);
      return;
    }

    const hasPremiumRole = await this.checkUserPremiumRole(user[0].discordId);
    const now = new Date();

    // Обновляем статус проверки
    await db
      .update(users)
      .set({
        discordPremiumActive: hasPremiumRole,
        discordPremiumLastChecked: now,
        discordPremiumRoleId: hasPremiumRole ? DISCORD_PREMIUM_ROLE_ID : null,
        updatedAt: now
      })
      .where(eq(users.id, userId));

    // Если роль есть - выдаем/продлеваем премиум
    if (hasPremiumRole) {
      await this.grantDiscordPremium(userId);
    } else {
      // Если роли нет - отзываем премиум (только если источник - discord)
      await this.revokeDiscordPremium(userId);
    }
  }

  /**
   * Выдает премиум пользователю от Discord
   */
  private async grantDiscordPremium(userId: string): Promise<void> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) return;

    const now = new Date();
    const currentPremium = user[0];

    // Проверяем, нужно ли обновлять премиум
    const needsUpdate = 
      currentPremium.premiumTier === 'none' ||
      currentPremium.premiumSource !== 'discord' ||
      !currentPremium.premiumEndDate ||
      new Date(currentPremium.premiumEndDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // меньше 7 дней

    if (!needsUpdate) {
      console.log(`User ${userId} already has active Discord premium`);
      return;
    }

    // Выдаем премиум на 30 дней
    const startDate = now;
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        premiumTier: 'basic',
        premiumStartDate: startDate,
        premiumEndDate: endDate,
        premiumSource: 'discord',
        premiumExternalId: user[0].discordId,
        premiumLastChecked: now,
        premiumAutoRenew: true,
        updatedAt: now
      })
      .where(eq(users.id, userId));

    // Логируем в историю
    await db.insert(premiumHistory).values({
      userId,
      tier: 'basic',
      startDate,
      endDate,
      source: 'discord',
      grantedBy: null,
      reason: 'Discord Premium role detected',
      autoRenewed: true
    });

    console.log(`✅ Discord premium granted to user ${userId} until ${endDate.toISOString()}`);
  }

  /**
   * Отзывает Discord премиум если роли больше нет
   */
  private async revokeDiscordPremium(userId: string): Promise<void> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) return;

    // Отзываем только если источник - discord
    if (user[0].premiumSource === 'discord' && user[0].premiumTier !== 'none') {
      const now = new Date();
      
      await db
        .update(users)
        .set({
          premiumTier: 'none',
          premiumEndDate: now,
          premiumAutoRenew: false,
          updatedAt: now
        })
        .where(eq(users.id, userId));

      console.log(`❌ Discord premium revoked from user ${userId}`);
    }
  }

  /**
   * Проверяет всех пользователей с привязанным Discord
   * Проверяет только тех, кто не проверялся больше CHECK_INTERVAL_MS
   */
  async checkAllDiscordUsers(): Promise<void> {
    console.log('🔄 Starting Discord premium check for all users...');

    const cutoffTime = new Date(Date.now() - CHECK_INTERVAL_MS);

    const usersToCheck = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.discordId),
          sql`(${users.discordPremiumLastChecked} IS NULL OR ${users.discordPremiumLastChecked} < ${cutoffTime})`
        )
      );

    console.log(`Found ${usersToCheck.length} users to check`);

    for (const user of usersToCheck) {
      try {
        await this.updateUserPremiumFromDiscord(user.id);
        // Небольшая задержка чтобы не забанил Discord API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to check user ${user.id}:`, error);
      }
    }

    console.log('✅ Discord premium check completed');
  }

  /**
   * Проверяет пользователей у которых истекает премиум от Discord
   */
  async checkExpiringDiscordPremiums(): Promise<void> {
    console.log('🔄 Checking expiring Discord premiums...');

    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // через 3 дня

    const expiringUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.premiumSource, 'discord'),
          isNotNull(users.discordId),
          isNotNull(users.premiumEndDate),
          lt(users.premiumEndDate, soon)
        )
      );

    console.log(`Found ${expiringUsers.length} users with expiring Discord premium`);

    for (const user of expiringUsers) {
      try {
        await this.updateUserPremiumFromDiscord(user.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to renew premium for user ${user.id}:`, error);
      }
    }

    console.log('✅ Expiring premiums check completed');
  }
}

export const discordPremiumService = new DiscordPremiumService();