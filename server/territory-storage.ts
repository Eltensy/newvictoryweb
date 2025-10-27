// server/territory-storage.ts - Финальная версия с копированием изображения карты

import {
  territories,
  territoryClaims,
  dropMapSettings,
  dropMapEligiblePlayers,
  dropMapInviteCodes,
  tournamentRegistrations,
  users,
  type Territory,
  type TerritoryClaim,
  type DropMapSettings,
  type DropMapEligiblePlayer,
  type DropMapInviteCode,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";

// В начале файла territory-storage.ts, замени константы:

const UNCLAIMED_COLOR = '#000000'; //  (0 игроков)
const SINGLE_PLAYER_COLOR = '#3B82F6'; // (1 игрок)
const MULTI_PLAYER_COLOR = '#EF4444'; // (2+ игрока)

export class DatabaseTerritoryStorage {

  // =============================================
  // ========== MAP METHODS ==========
  // =============================================

  async createEmptyMap(name: string, description?: string, mapImageUrl?: string, createdBy?: string): Promise<DropMapSettings> {
    const [newMap] = await db.insert(dropMapSettings).values({ name, description, mapImageUrl, createdBy, mode: 'tournament' }).returning();
    if (!newMap) throw new Error('Failed to create map');
    return newMap;
  }

  async createMapFromSourceMap(sourceMapId: string, name: string, description?: string, mapImageUrl?: string, createdBy?: string): Promise<DropMapSettings> {
    return db.transaction(async (tx) => {
      // 1. Получаем исходную карту, чтобы получить URL ее изображения
      const [sourceMap] = await tx.select().from(dropMapSettings).where(eq(dropMapSettings.id, sourceMapId));
      if (!sourceMap) {
        throw new Error('Source map not found');
      }

      // 2. Создаем новую карту
      const [newMap] = await tx.insert(dropMapSettings).values({ 
        name, 
        description, 
        // Если передан новый URL — используем его, иначе — берем URL из исходной карты
        mapImageUrl: mapImageUrl || sourceMap.mapImageUrl, 
        createdFrom: sourceMapId, 
        createdBy, 
        mode: 'tournament' 
      }).returning();
      
      if (!newMap) throw new Error('Failed to create new map');

      // 3. Копируем территории
      const sourceTerritories = await tx.select().from(territories).where(eq(territories.mapId, sourceMapId));
      if (sourceTerritories.length > 0) {
        await tx.insert(territories).values(sourceTerritories.map(t => ({ 
            ...t, 
            id: undefined, 
            mapId: newMap.id, 
            ownerId: null, 
            claimedAt: null, 
            color: UNCLAIMED_COLOR, 
            createdAt: undefined, 
            updatedAt: undefined, 
        })));
      }
      return newMap;
    });
  }

  async getMap(id: string): Promise<DropMapSettings | undefined> {
    const [map] = await db.select().from(dropMapSettings).where(eq(dropMapSettings.id, id));
    return map;
  }

  async getAllMaps(): Promise<DropMapSettings[]> {
    return db.select().from(dropMapSettings).orderBy(desc(dropMapSettings.createdAt));
  }
  private getTerritoryColor(claimCount: number): string {
  if (claimCount === 0) return UNCLAIMED_COLOR;
  if (claimCount === 1) return SINGLE_PLAYER_COLOR;
  return MULTI_PLAYER_COLOR; // 2+
}

  async updateMap(id: string, updates: Partial<Omit<DropMapSettings, 'id' | 'createdAt'>>): Promise<DropMapSettings> {
    const [updated] = await db.update(dropMapSettings).set({ ...updates, updatedAt: new Date() }).where(eq(dropMapSettings.id, id)).returning();
    if (!updated) throw new Error('Map not found');
    return updated;
  }

  async deleteMap(mapId: string): Promise<void> {
    await db.delete(dropMapSettings).where(eq(dropMapSettings.id, mapId));
  }

  // =============================================
  // ========== TERRITORY METHODS ==========
  // =============================================

  async getMapTerritories(mapId: string): Promise<any[]> {
  const territoriesData = await db
    .select({ 
      territory: territories, 
      ownerUsername: users.username, 
      ownerDisplayName: users.displayName 
    })
    .from(territories)
    .leftJoin(users, sql`(${territories.ownerId})::text = (${users.id})::text`)
    .where(eq(territories.mapId, mapId));
  
  const territoryIds = territoriesData.map(t => t.territory.id);
  if (territoryIds.length === 0) return [];

  const allClaims = await db
    .select({ 
      claim: territoryClaims,
      user: { username: users.username, displayName: users.displayName },
      invite: dropMapInviteCodes,
      eligiblePlayer: dropMapEligiblePlayers // ДОБАВЛЕНО
    })
    .from(territoryClaims)
    .leftJoin(users, sql`(${territoryClaims.userId})::text = (${users.id})::text`)
    .leftJoin(
      dropMapInviteCodes,
      sql`${territoryClaims.territoryId} = ${dropMapInviteCodes.territoryId} 
          AND ${dropMapInviteCodes.isUsed} = true`
    )
    .leftJoin( // ДОБАВЛЕНО: джойним виртуальных игроков
      dropMapEligiblePlayers,
      sql`(${territoryClaims.userId})::text = (${dropMapEligiblePlayers.userId})::text`
    )
    .where(
      and(
        inArray(territoryClaims.territoryId, territoryIds),
        eq(territoryClaims.claimType, 'claim'),
        isNull(territoryClaims.revokedAt)
      )
    );

  const claimsByTerritory = allClaims.reduce((acc, row) => {
    const id = row.claim.territoryId;
    if (!acc[id]) acc[id] = [];
    
    let displayName: string;
    let username: string;
    let userId: string;
    
    if (row.claim.userId) {
      userId = row.claim.userId;
      
      // ИЗМЕНЕНО: Проверяем, виртуальный ли это игрок
      if (userId.startsWith('virtual-')) {
        // Виртуальный игрок - берём данные из eligiblePlayer
        displayName = row.eligiblePlayer?.displayName || row.invite?.displayName || 'Виртуальный игрок';
        username = 'virtual';
      } else if (row.user) {
        // Обычный пользователь
        displayName = row.user.displayName || 'Неизвестный';
        username = row.user.username || 'unknown';
      } else {
        // Фоллбэк для старых данных
        displayName = row.invite?.displayName || 'Неизвестный';
        username = 'unknown';
      }
    } else {
      // Старый формат без userId
      userId = `anonymous-${row.claim.id}`;
      displayName = 'Анонимный игрок';
      username = 'anonymous';
    }
    
    const exists = acc[id].find((c: any) => c.userId === userId);
    if (!exists) {
      acc[id].push({ 
        userId,
        username,
        displayName,
        claimedAt: row.claim.claimedAt 
      });
    }
    
    return acc;
  }, {} as Record<string, any[]>);

  return territoriesData.map(row => {
    const claims = claimsByTerritory[row.territory.id] || [];
    return { 
      ...row.territory, 
      owner: row.territory.ownerId ? { 
        id: row.territory.ownerId, 
        username: row.ownerUsername || '', 
        displayName: row.ownerDisplayName || '' 
      } : undefined, 
      claims, 
      claimCount: claims.length 
    };
  });
}
  
  async createTerritory(data: { mapId: string; name: string; points: any; color?: string; maxPlayers?: number; description?: string; }): Promise<Territory> {
    const [territory] = await db.insert(territories).values({ mapId: data.mapId, name: data.name, points: data.points, color: data.color || UNCLAIMED_COLOR, maxPlayers: data.maxPlayers || 1, description: data.description }).returning();
    return territory;
  }

  async getTerritory(id: string): Promise<Territory | undefined> {
    const [territory] = await db.select().from(territories).where(eq(territories.id, id));
    return territory;
  }

  async updateTerritory(id: string, updates: Partial<Territory>): Promise<Territory> {
    const [updated] = await db.update(territories).set({ ...updates, updatedAt: new Date() }).where(eq(territories.id, id)).returning();
    if (!updated) throw new Error('Territory not found');
    return updated;
  }

  async deleteTerritory(id: string): Promise<void> {
    await db.delete(territories).where(eq(territories.id, id));
  }

  // =============================================
  // ========== PLAYER METHODS ==========
  // =============================================

  async addPlayersToMap(mapId: string, userIds: string[], addedBy: string): Promise<{ added: number; skipped: number; errors: string[] }> {
    const usersData = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(inArray(users.id, userIds));
    if (usersData.length === 0) return { added: 0, skipped: 0, errors: userIds.map(id => `User ${id} not found`) };
    
    const playersToInsert = usersData.map(u => ({ settingsId: mapId, userId: u.id, displayName: u.displayName, addedBy, sourceType: 'manual' }));
    
    const inserted = await db.insert(dropMapEligiblePlayers).values(playersToInsert).onConflictDoNothing().returning();
    return { added: inserted.length, skipped: userIds.length - inserted.length, errors: [] };
  }

  async removePlayerFromMap(mapId: string, userId: string): Promise<void> {
    await db.delete(dropMapEligiblePlayers).where(and(eq(dropMapEligiblePlayers.settingsId, mapId), eq(dropMapEligiblePlayers.userId, userId)));
  }

  async getMapPlayers(mapId: string): Promise<any[]> {
  const players = await db
    .select({ 
      player: dropMapEligiblePlayers, 
      user: { 
        id: users.id, 
        username: users.username, 
        displayName: users.displayName 
      } 
    })
    .from(dropMapEligiblePlayers)
    .leftJoin(users, eq(dropMapEligiblePlayers.userId, users.id))
    .where(eq(dropMapEligiblePlayers.settingsId, mapId))
    .orderBy(desc(dropMapEligiblePlayers.addedAt));
  
  // ИЗМЕНЕНО: Обрабатываем виртуальных игроков
  return players.map(p => ({
    ...p.player,
    user: p.player.userId.startsWith('virtual-') 
      ? { 
          id: p.player.userId,
          username: 'virtual',
          displayName: p.player.displayName 
        }
      : p.user
  }));
}

  async isUserEligibleForMap(mapId: string, userId: string): Promise<boolean> {
  const [player] = await db
    .select()
    .from(dropMapEligiblePlayers)
    .where(
      and(
        eq(dropMapEligiblePlayers.settingsId, mapId),
        eq(dropMapEligiblePlayers.userId, userId)
      )
    )
    .limit(1);
  
  return !!player;
}
  
  async importPlayersFromTournament(mapId: string, tournamentId: string, positions?: number[], topN?: number, addedBy?: string): Promise<DropMapEligiblePlayer[]> {
    let query = db.select({ userId: tournamentRegistrations.userId, displayName: users.displayName }).from(tournamentRegistrations)
      .innerJoin(users, eq(tournamentRegistrations.userId, users.id))
      .where(and(eq(tournamentRegistrations.tournamentId, tournamentId), eq(tournamentRegistrations.status, 'paid')))
      .orderBy(tournamentRegistrations.registeredAt);

    let registrations = await query;
    if (positions?.length) registrations = registrations.filter((_, i) => positions.includes(i + 1));
    else if (topN) registrations = registrations.slice(0, topN);
    if (!registrations.length) return [];
    
    const playersToInsert = registrations.map(reg => ({ settingsId: mapId, userId: reg.userId, displayName: reg.displayName, addedBy: addedBy || 'system', sourceType: 'tournament_import' }));
    return db.insert(dropMapEligiblePlayers).values(playersToInsert).onConflictDoNothing().returning();
  }
  
  // =============================================
  // ========== CLAIM METHODS ==========
  // =============================================

  async claimTerritory(territoryId: string, userId: string): Promise<TerritoryClaim> {
  return db.transaction(async (tx) => {
    const [territory] = await tx.select().from(territories).where(eq(territories.id, territoryId));
    if (!territory || !territory.mapId) throw new Error('Territory or associated map not found');

    const oldClaims = await tx.select({ id: territoryClaims.id, territoryId: territoryClaims.territoryId })
      .from(territoryClaims)
      .innerJoin(territories, eq(territoryClaims.territoryId, territories.id))
      .where(and(
        eq(territoryClaims.userId, userId), 
        eq(territories.mapId, territory.mapId), 
        eq(territoryClaims.claimType, 'claim'), 
        isNull(territoryClaims.revokedAt)
      ));
    
    const oldClaim = oldClaims[0];

    if (oldClaim && oldClaim.territoryId !== territoryId) {
      await tx.update(territoryClaims).set({ revokedAt: new Date() }).where(eq(territoryClaims.id, oldClaim.id));

      const remainingOnOld = await tx.select({ id: territoryClaims.id, userId: territoryClaims.userId }).from(territoryClaims)
        .where(and(
          eq(territoryClaims.territoryId, oldClaim.territoryId),
          eq(territoryClaims.claimType, 'claim'),
          isNull(territoryClaims.revokedAt)
        )).orderBy(territoryClaims.claimedAt);

      // ИЗМЕНЕНО: Обновляем цвет старой территории
      const oldTerritoryColor = this.getTerritoryColor(remainingOnOld.length);
      
      if (remainingOnOld.length === 0) {
        await tx.update(territories).set({ 
          ownerId: null, 
          claimedAt: null, 
          color: oldTerritoryColor 
        }).where(eq(territories.id, oldClaim.territoryId));
      } else {
        const [oldTerritory] = await tx.select({ ownerId: territories.ownerId }).from(territories).where(eq(territories.id, oldClaim.territoryId));
        if (oldTerritory.ownerId === userId) {
          await tx.update(territories).set({ 
            ownerId: remainingOnOld[0].userId,
            color: oldTerritoryColor // ДОБАВЛЕНО
          }).where(eq(territories.id, oldClaim.territoryId));
        } else {
          // Просто обновляем цвет
          await tx.update(territories).set({ 
            color: oldTerritoryColor 
          }).where(eq(territories.id, oldClaim.territoryId));
        }
      }
    }

    const currentClaims = await tx.select({ id: territoryClaims.id, userId: territoryClaims.userId }).from(territoryClaims)
      .where(and(
        eq(territoryClaims.territoryId, territoryId), 
        eq(territoryClaims.claimType, 'claim'), 
        isNull(territoryClaims.revokedAt)
      ));
      
    if (currentClaims.length >= (territory.maxPlayers || 999)) {
      const userAlreadyOnThisTerritory = currentClaims.some(c => c.userId === userId);
      if (userAlreadyOnThisTerritory) {
        const [existingClaim] = await tx.select().from(territoryClaims)
          .where(and(
            eq(territoryClaims.territoryId, territoryId), 
            eq(territoryClaims.userId, userId), 
            isNull(territoryClaims.revokedAt)
          ));
        return existingClaim;
      }
      throw new Error(`Максимум ${territory.maxPlayers} игрок(ов) на локации`);
    }

    // ИЗМЕНЕНО: Вычисляем новый цвет после добавления игрока
    const newClaimCount = currentClaims.length + 1;
    const newColor = this.getTerritoryColor(newClaimCount);

    if (currentClaims.length === 0) {
      await tx.update(territories).set({ 
        ownerId: userId, 
        claimedAt: new Date(),
        color: newColor 
      }).where(eq(territories.id, territoryId));
    } else {
      // Обновляем только цвет, если это не первый игрок
      await tx.update(territories).set({ 
        color: newColor 
      }).where(eq(territories.id, territoryId));
    }

    const [newClaim] = await tx.insert(territoryClaims).values({ territoryId, userId, claimType: 'claim' }).returning();
    return newClaim;
  });
}
  

  async getUserTerritoryClaimForTerritory(territoryId: string, userId: string): Promise<TerritoryClaim | undefined> {
    const [claim] = await db.select().from(territoryClaims).where(and(eq(territoryClaims.territoryId, territoryId), eq(territoryClaims.userId, userId), eq(territoryClaims.claimType, 'claim'), isNull(territoryClaims.revokedAt)));
    return claim;
  }

  async removeUserClaim(territoryId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(territoryClaims).set({ revokedAt: new Date() })
      .where(and(
        eq(territoryClaims.territoryId, territoryId), 
        eq(territoryClaims.userId, userId), 
        eq(territoryClaims.claimType, 'claim'), 
        isNull(territoryClaims.revokedAt)
      ));
    
    const remaining = await tx.select({ userId: territoryClaims.userId }).from(territoryClaims)
      .where(and(
        eq(territoryClaims.territoryId, territoryId), 
        eq(territoryClaims.claimType, 'claim'), 
        isNull(territoryClaims.revokedAt)
      )).orderBy(territoryClaims.claimedAt);
      
    const [currentTerritory] = await tx.select({ ownerId: territories.ownerId }).from(territories)
      .where(eq(territories.id, territoryId));
    
    // ИЗМЕНЕНО: Вычисляем цвет на основе оставшихся игроков
    const newColor = this.getTerritoryColor(remaining.length);
    
    if (remaining.length === 0) {
      await tx.update(territories).set({ 
        ownerId: null, 
        claimedAt: null,
        color: newColor
      }).where(eq(territories.id, territoryId));
    } else if (currentTerritory.ownerId === userId) {
      await tx.update(territories).set({ 
        ownerId: remaining[0].userId,
        color: newColor // ДОБАВЛЕНО
      }).where(eq(territories.id, territoryId));
    } else {
      // Просто обновляем цвет
      await tx.update(territories).set({ 
        color: newColor 
      }).where(eq(territories.id, territoryId));
    }
  });
}

  // =============================================
  // ========== INVITE METHODS ==========
  // =============================================

  async createInvite(mapId: string, displayName: string, expiresInDays: number, createdBy?: string): Promise<DropMapInviteCode> {
    const code = `invite-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const [invite] = await db.insert(dropMapInviteCodes).values({ settingsId: mapId, code, displayName, expiresAt, createdBy }).returning();
    return invite;
  }

  async validateInvite(code: string): Promise<{ valid: boolean; error?: string; invite?: DropMapInviteCode }> {
    const [invite] = await db.select().from(dropMapInviteCodes).where(eq(dropMapInviteCodes.code, code));
    if (!invite) return { valid: false, error: 'Код не найден' };
    if (invite.isUsed) return { valid: false, error: 'Код уже использован' };
    if (invite.expiresAt && new Date() > invite.expiresAt) return { valid: false, error: 'Срок действия кода истёк' };
    return { valid: true, invite };
  }

  async getInvites(mapId: string): Promise<DropMapInviteCode[]> {
    return db.select().from(dropMapInviteCodes).where(eq(dropMapInviteCodes.settingsId, mapId)).orderBy(desc(dropMapInviteCodes.createdAt));
  }

  async deleteInvite(code: string): Promise<void> {
    await db.delete(dropMapInviteCodes).where(eq(dropMapInviteCodes.code, code));
  }

  async claimTerritoryWithInvite(code: string, territoryId: string): Promise<{ claim: TerritoryClaim; invite: DropMapInviteCode }> {
  return db.transaction(async (tx) => {
    const { valid, error, invite } = await this.validateInvite(code);
    if (!valid || !invite) throw new Error(error);

    const [map] = await tx.select().from(dropMapSettings).where(eq(dropMapSettings.id, invite.settingsId));
    if (!map) throw new Error('Карта для этого инвайта не найдена');
    if (map.isLocked) throw new Error('Карта заблокирована');

    const [territory] = await tx.select().from(territories).where(eq(territories.id, territoryId));
    if (!territory) throw new Error('Territory not found');
    if (territory.mapId !== invite.settingsId) throw new Error('Territory does not belong to this map');

    const currentClaims = await tx.select({ id: territoryClaims.id }).from(territoryClaims)
      .where(and(
        eq(territoryClaims.territoryId, territoryId), 
        eq(territoryClaims.claimType, 'claim'), 
        isNull(territoryClaims.revokedAt)
      ));
      
    if (currentClaims.length >= (territory.maxPlayers || 999)) {
      throw new Error(`Максимум ${territory.maxPlayers} игрок(ов) на локации`);
    }

    // НОВОЕ: Создаём или получаем ID виртуального игрока
    let virtualPlayerId = invite.virtualPlayerId;
    
    if (!virtualPlayerId) {
      // Генерируем уникальный ID для виртуального игрока
      virtualPlayerId = `virtual-${invite.code}-${Date.now()}`;
      
      // ДОБАВЛЯЕМ виртуального игрока в список допущенных
      await tx.insert(dropMapEligiblePlayers).values({
        settingsId: invite.settingsId,
        userId: virtualPlayerId, // Используем виртуальный ID как userId
        displayName: invite.displayName,
        sourceType: 'invite',
        addedBy: 'system',
      });
      
      // Сохраняем virtualPlayerId в инвайт-коде
      await tx.update(dropMapInviteCodes)
        .set({ virtualPlayerId })
        .where(eq(dropMapInviteCodes.code, code));
    }

    const newClaimCount = currentClaims.length + 1;
    const newColor = this.getTerritoryColor(newClaimCount);

    if (currentClaims.length === 0) {
      await tx.update(territories).set({ 
        color: newColor,
        claimedAt: new Date()
      }).where(eq(territories.id, territoryId));
    } else {
      await tx.update(territories).set({ 
        color: newColor
      }).where(eq(territories.id, territoryId));
    }

    // ИЗМЕНЕНО: Создаём клейм с виртуальным userId
    const [newClaim] = await tx.insert(territoryClaims).values({ 
      territoryId, 
      userId: virtualPlayerId, // Используем виртуальный ID
      claimType: 'claim', 
      reason: `Invite: ${invite.displayName}`
    }).returning();
    
    // Помечаем инвайт как использованный
    await tx.update(dropMapInviteCodes).set({ 
      isUsed: true, 
      usedAt: new Date(), 
      territoryId 
    }).where(eq(dropMapInviteCodes.code, code));
    
    return { claim: newClaim, invite };
  });
}

  // ===== Admin & Logging =====
  
  async logAdminActivity(adminId: string, actionType: string, description: string, metadata?: any): Promise<void> {
      console.log(`[ADMIN LOG] User: ${adminId}, Action: ${actionType}, Details: ${description}`, metadata);
  }

  async getAdminActivityLogs(limit: number): Promise<any[]> {
    console.log(`Fetching last ${limit} admin logs... (Not implemented)`);
    return [];
  }

  // ===== ALIASES FOR BACKWARD COMPATIBILITY =====

  async getDropMapPlayers(mapId: string): Promise<any[]> { return this.getMapPlayers(mapId); }
  async removeDropMapPlayer(mapId: string, userId: string): Promise<void> { return this.removePlayerFromMap(mapId, userId); }
  async createDropMapInvite(mapId: string, displayName: string, expiresInDays: number, createdBy?: string): Promise<DropMapInviteCode> { return this.createInvite(mapId, displayName, expiresInDays, createdBy); }
  async getDropMapInvites(mapId: string): Promise<DropMapInviteCode[]> { return this.getInvites(mapId); }
  async deleteDropMapInvite(code: string): Promise<void> { return this.deleteInvite(code); }
  async validateDropMapInvite(code: string): Promise<{ valid: boolean; error?: string; invite?: DropMapInviteCode }> { return this.validateInvite(code); }
  async importDropMapPlayersFromTournament(mapId: string, tournamentId: string, positions?: number[], topN?: number, addedBy?: string): Promise<DropMapEligiblePlayer[]> { return this.importPlayersFromTournament(mapId, tournamentId, positions, topN, addedBy); }
}

export const territoryStorage = new DatabaseTerritoryStorage();