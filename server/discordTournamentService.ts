// server/discordTournamentService.ts
// Discord Tournament Integration Service

import type { Tournament } from "@shared/schema";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordRole {
  id: string;
  name: string;
}

interface TournamentChannels {
  categoryId: string;
  infoChannelId: string;
  chatChannelId: string;
  passwordChannelId: string;
  mapChannelId: string;
}

export class DiscordTournamentService {

  /**
   * Создает роль для турнира
   */
  async createTournamentRole(tournamentName: string): Promise<string> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Турнир - ${tournamentName}`,
            color: 0x5865F2, // Discord blue
            hoist: true, // Show separately in member list
            mentionable: true
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create role: ${response.status} - ${error}`);
      }

      const role: DiscordRole = await response.json();
      console.log(`✅ Created Discord role: ${role.name} (${role.id})`);
      return role.id;

    } catch (error) {
      console.error('Failed to create Discord role:', error);
      throw error;
    }
  }

  /**
   * Создает категорию и каналы для турнира
   */
  async createTournamentChannels(
    tournamentName: string,
    roleId: string
  ): Promise<TournamentChannels> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
    }

    try {
      // 1. Create category
      const categoryResponse = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `🏆 ${tournamentName}`,
            type: 4, // Category
            permission_overwrites: [
              {
                id: DISCORD_GUILD_ID, // @everyone
                type: 0,
                deny: '1024' // VIEW_CHANNEL
              },
              {
                id: roleId, // Tournament role
                type: 0,
                allow: '1024' // VIEW_CHANNEL
              }
            ]
          })
        }
      );

      if (!categoryResponse.ok) {
        const error = await categoryResponse.text();
        throw new Error(`Failed to create category: ${categoryResponse.status} - ${error}`);
      }

      const category: DiscordChannel = await categoryResponse.json();
      console.log(`✅ Created Discord category: ${category.name} (${category.id})`);

      // 2. Create Info Channel (read-only for participants)
      const infoChannel = await this.createChannel(
        '📋-информация',
        category.id,
        roleId,
        false // read-only
      );

      // 3. Create Chat Channel (can write)
      const chatChannel = await this.createChannel(
        '💬-чат',
        category.id,
        roleId,
        true // can write
      );

      // 4. Create Password Channel (admin-only)
      const passwordChannel = await this.createChannel(
        '🔐-пароль',
        category.id,
        roleId,
        false,
        true // admin-only
      );

      // 5. Create Map Channel (read-only for participants)
      const mapChannel = await this.createChannel(
        '🗺️-карта',
        category.id,
        roleId,
        false // read-only
      );

      console.log(`✅ Created all tournament channels for: ${tournamentName}`);

      return {
        categoryId: category.id,
        infoChannelId: infoChannel.id,
        chatChannelId: chatChannel.id,
        passwordChannelId: passwordChannel.id,
        mapChannelId: mapChannel.id
      };

    } catch (error) {
      console.error('Failed to create Discord channels:', error);
      throw error;
    }
  }

  /**
   * Создает отдельный канал с правами доступа
   */
  private async createChannel(
    name: string,
    categoryId: string,
    roleId: string,
    canWrite: boolean,
    adminOnly: boolean = false
  ): Promise<DiscordChannel> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
    }

    const permissionOverwrites: any[] = [
      {
        id: DISCORD_GUILD_ID, // @everyone
        type: 0,
        deny: '1024' // VIEW_CHANNEL
      }
    ];

    if (adminOnly) {
      // Admin-only channel - только администраторы видят
      // Участники турнира НЕ имеют доступа
    } else {
      // Participants can see
      const permissions = canWrite
        ? '3072' // VIEW_CHANNEL + SEND_MESSAGES
        : '1024'; // Only VIEW_CHANNEL

      permissionOverwrites.push({
        id: roleId,
        type: 0,
        allow: permissions
      });
    }

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          type: 0, // Text channel
          parent_id: categoryId,
          permission_overwrites: permissionOverwrites
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create channel ${name}: ${response.status} - ${error}`);
    }

    const channel: DiscordChannel = await response.json();
    console.log(`✅ Created Discord channel: ${channel.name} (${channel.id})`);
    return channel;
  }

  /**
   * Постит красивое сообщение с информацией о турнире
   */
  async postTournamentInfo(
    channelId: string,
    tournament: any
  ): Promise<void> {
    if (!DISCORD_BOT_TOKEN) {
      throw new Error('Discord bot token missing');
    }

    try {
      // Format prize distribution
      let prizeFields = [];

      if (tournament.prizeDistribution && Object.keys(tournament.prizeDistribution).length > 0) {
        const prizes = Object.entries(tournament.prizeDistribution as Record<string, number>)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([place, amount]) => {
            const placeEmoji = ['🥇', '🥈', '🥉'][parseInt(place) - 1] || '🏅';
            return `${placeEmoji} **${place} место**: ${amount.toLocaleString()} ₽`;
          })
          .join('\n');

        prizeFields.push({
          name: '💰 Призовой фонд',
          value: prizes,
          inline: false
        });
      } else {
        prizeFields.push({
          name: '💰 Призовой фонд',
          value: `${tournament.prize.toLocaleString()} ₽`,
          inline: true
        });
      }

      const embed = {
        title: `🏆 ${tournament.name}`,
        description: tournament.description || 'Турнир',
        color: 0x5865F2, // Discord blue
        fields: [
          ...prizeFields,
          {
            name: '💳 Взнос',
            value: tournament.entryFee === 0
              ? 'Бесплатно'
              : `${tournament.entryFee.toLocaleString()} ₽`,
            inline: true
          },
          {
            name: '👥 Участники',
            value: tournament.maxParticipants
              ? `${tournament.currentParticipants} / ${tournament.maxParticipants}`
              : `${tournament.currentParticipants}`,
            inline: true
          },
          {
            name: '📜 Правила',
            value: tournament.rules || 'Правила будут объявлены позже',
            inline: false
          }
        ],
        footer: {
          text: 'Удачи в турнире!'
        },
        timestamp: new Date().toISOString()
      };

      if (tournament.imageUrl) {
        embed['image'] = { url: tournament.imageUrl };
      }

      if (tournament.mapUrl) {
        embed.fields.push({
          name: '🗺️ Карта',
          value: `[Открыть карту](${tournament.mapUrl})`,
          inline: false
        });
      }

      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embeds: [embed]
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to post message: ${response.status} - ${error}`);
      }

      console.log(`✅ Posted tournament info to channel ${channelId}`);

    } catch (error) {
      console.error('Failed to post tournament info:', error);
      throw error;
    }
  }

  /**
   * Выдает роль турнира участнику
   */
  async assignTournamentRole(discordId: string, roleId: string): Promise<void> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`User ${discordId} not found in guild`);
          return;
        }
        const error = await response.text();
        throw new Error(`Failed to assign role: ${response.status} - ${error}`);
      }

      console.log(`✅ Assigned role ${roleId} to user ${discordId}`);

    } catch (error) {
      console.error('Failed to assign tournament role:', error);
      throw error;
    }
  }

  /**
   * Удаляет роль турнира у участника
   */
  async removeTournamentRole(discordId: string, roleId: string): Promise<void> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
    }

    try {
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`User ${discordId} or role ${roleId} not found`);
          return;
        }
        const error = await response.text();
        throw new Error(`Failed to remove role: ${response.status} - ${error}`);
      }

      console.log(`✅ Removed role ${roleId} from user ${discordId}`);

    } catch (error) {
      console.error('Failed to remove tournament role:', error);
      throw error;
    }
  }

  /**
   * Проверяет наличие роли у пользователя
   */
  async hasRole(discordId: string, roleId: string): Promise<boolean> {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
      throw new Error('Discord configuration missing');
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
          return false;
        }
        throw new Error(`Failed to get member: ${response.status}`);
      }

      const member = await response.json();
      return member.roles.includes(roleId);

    } catch (error) {
      console.error('Failed to check role:', error);
      return false;
    }
  }
}

export const discordTournamentService = new DiscordTournamentService();
