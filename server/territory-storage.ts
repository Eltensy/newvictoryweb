import {
  territoryShapes,
  territoryTemplates,
  territories,
  territoryClaims,
  dropMapSettings,
  dropMapEligiblePlayers,
  dropMapInviteCodes,
  tournamentRegistrations,
  InsertDropMapSettings,
  DropMapSettings,
  DropMapEligiblePlayer,
  DropMapInviteCode,
  users,
  tournaments,
  type TerritoryShape,
  type Territory,
  type TerritoryClaim,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, inArray, or } from "drizzle-orm";

export interface ITerritoryStorage {

deleteTerritory(territoryId: string): Promise<void>;

  // Шаблоны контуров
  createShape(shape: { name: string; points: any; defaultColor: string; description?: string; createdBy?: string }): Promise<TerritoryShape>;
  getAllShapes(): Promise<any[]>;
  getShape(id: string): Promise<TerritoryShape | undefined>;
  updateShape(id: string, updates: Partial<TerritoryShape>): Promise<TerritoryShape | undefined>;
  deleteShape(id: string): Promise<void>;
  
  // Шаблоны карт
  createTemplate(template: { name: string; description?: string; mapImageUrl?: string; shapeIds: string[]; tournamentId?: string; createdBy?: string }): Promise<any>;
  getAllTemplatesWithDetails(): Promise<any[]>;
  getTemplateWithShapes(templateId: string): Promise<any>;
  getActiveTemplate(): Promise<any>;
  setActiveTemplate(templateId: string): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  
  // Территории
  getTerritoriesForTemplate(templateId: string, userId?: string): Promise<any[]>;
  getTerritory(id: string): Promise<Territory | undefined>;
  
  // Клеймы
  claimTerritory(territoryId: string, userId: string): Promise<TerritoryClaim>;
  revokeTerritory(territoryId: string, adminId: string, reason: string): Promise<void>;
  getUserTerritories(userId: string): Promise<any[]>;
  
  // Логи
  getAdminActivityLogs(limit?: number): Promise<any[]>;

    createDropMapSettings(data: InsertDropMapSettings): Promise<DropMapSettings>;
  getDropMapSettings(settingsId: string): Promise<DropMapSettings | undefined>;
  getDropMapByTemplate(templateId: string): Promise<DropMapSettings | undefined>;
  updateDropMapSettings(settingsId: string, updates: Partial<DropMapSettings>): Promise<DropMapSettings>;
  
  addDropMapPlayer(settingsId: string, userId: string | null, displayName: string, addedBy: string, sourceType?: string): Promise<DropMapEligiblePlayer>;
  getDropMapPlayers(settingsId: string): Promise<DropMapEligiblePlayer[]>;
  removeDropMapPlayer(settingsId: string, userId: string): Promise<void>;
  isPlayerEligibleForDropMap(settingsId: string, userId: string): Promise<boolean>;
  importDropMapPlayersFromTournament(settingsId: string, tournamentId: string, positions?: number[], topN?: number, addedBy?: string): Promise<DropMapEligiblePlayer[]>;
  
  createDropMapInvite(settingsId: string, displayName: string, expiresInDays: number, createdBy?: string): Promise<DropMapInviteCode>;
  getDropMapInvite(code: string): Promise<DropMapInviteCode | undefined>;
  validateDropMapInvite(code: string): Promise<{ valid: boolean; error?: string; invite?: DropMapInviteCode }>;
  useDropMapInvite(code: string, territoryId: string): Promise<void>;
  getDropMapInvites(settingsId: string): Promise<DropMapInviteCode[]>;
  deleteDropMapInvite(code: string): Promise<void>;
  
  claimTerritoryWithInvite(code: string, territoryId: string): Promise<{ claim: TerritoryClaim; invite: DropMapInviteCode }>;
}

export class DatabaseTerritoryStorage implements ITerritoryStorage {

async deleteTerritory(territoryId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Сначала удаляем все связанные claims
    await tx
      .delete(territoryClaims)
      .where(eq(territoryClaims.territoryId, territoryId));
    
    // Затем удаляем саму территорию
    await tx
      .delete(territories)
      .where(eq(territories.id, territoryId));
  });
}

  async createDropMapSettings(data: any) {
    const [settings] = await db
      .insert(dropMapSettings)
      .values(data)
      .returning();
    return settings;
  }
  
  async getDropMapSettings(settingsId: string) {
    const [settings] = await db
      .select()
      .from(dropMapSettings)
      .where(eq(dropMapSettings.id, settingsId));
    return settings;
  }
  
  async getDropMapByTemplate(templateId: string) {
    const [settings] = await db
      .select()
      .from(dropMapSettings)
      .where(eq(dropMapSettings.templateId, templateId))
      .orderBy(desc(dropMapSettings.createdAt))
      .limit(1);
    return settings;
  }
  
  async updateDropMapSettings(settingsId: string, updates: Partial<DropMapSettings>) {
    const [settings] = await db
      .update(dropMapSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dropMapSettings.id, settingsId))
      .returning();
    return settings;
  }
  
  async addDropMapPlayer(settingsId: string, userId: string | null, displayName: string, addedBy: string, sourceType?: string) {
    const [player] = await db
      .insert(dropMapEligiblePlayers)
      .values({
        settingsId,
        userId,
        displayName,
        sourceType,
        addedBy,
      })
      .returning();
    return player;
  }
  
  async getDropMapPlayers(settingsId: string) {
    const players = await db
      .select({
        player: dropMapEligiblePlayers,
        user: users,
      })
      .from(dropMapEligiblePlayers)
      .leftJoin(users, eq(dropMapEligiblePlayers.userId, users.id))
      .where(eq(dropMapEligiblePlayers.settingsId, settingsId))
      .orderBy(dropMapEligiblePlayers.addedAt);
    
    return players.map(row => ({
      ...row.player,
      user: row.user ? {
        id: row.user.id,
        username: row.user.username,
        displayName: row.user.displayName,
      } : undefined,
    }));
  }
  
  async removeDropMapPlayer(settingsId: string, userId: string) {
    await db
      .delete(dropMapEligiblePlayers)
      .where(and(
        eq(dropMapEligiblePlayers.settingsId, settingsId),
        eq(dropMapEligiblePlayers.userId, userId)
      ));
  }
  
  async isPlayerEligibleForDropMap(settingsId: string, userId: string) {
    const [player] = await db
      .select()
      .from(dropMapEligiblePlayers)
      .where(and(
        eq(dropMapEligiblePlayers.settingsId, settingsId),
        eq(dropMapEligiblePlayers.userId, userId)
      ));
    return !!player;
  }
  
  async importDropMapPlayersFromTournament(
    settingsId: string,
    tournamentId: string,
    positions?: number[],
    topN?: number,
    addedBy?: string
  ) {
    const registrations = await db
      .select({
        registration: tournamentRegistrations,
        user: users,
      })
      .from(tournamentRegistrations)
      .leftJoin(users, eq(tournamentRegistrations.userId, users.id))
      .where(and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.status, 'paid')
      ))
      .orderBy(tournamentRegistrations.registeredAt);
    
    let playersToAdd = registrations;
    
    if (positions && positions.length > 0) {
      playersToAdd = registrations.filter((_, index) => 
        positions.includes(index + 1)
      );
    } else if (topN) {
      playersToAdd = registrations.slice(0, topN);
    }
    
    const added = [];
    for (const { registration, user } of playersToAdd) {
      if (!user) continue;
      
      const exists = await this.isPlayerEligibleForDropMap(settingsId, user.id);
      if (exists) continue;
      
      const player = await this.addDropMapPlayer(
        settingsId,
        user.id,
        user.displayName,
        addedBy || 'system',
        'tournament_import'
      );
      added.push(player);
    }
    
    return added;
  }
  
  async createDropMapInvite(settingsId: string, displayName: string, expiresInDays: number, createdBy?: string) {
    const code = `invite-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const [invite] = await db
      .insert(dropMapInviteCodes)
      .values({
        settingsId,
        code,
        displayName,
        expiresAt,
        createdBy,
      })
      .returning();
    
    return invite;
  }
  
  async getDropMapInvite(code: string) {
    const [invite] = await db
      .select()
      .from(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.code, code));
    return invite;
  }
  
  async validateDropMapInvite(code: string) {
    const invite = await this.getDropMapInvite(code);
    
    if (!invite) return { valid: false, error: 'Код не найден' };
    if (invite.isUsed) return { valid: false, error: 'Код уже использован' };
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return { valid: false, error: 'Код истёк' };
    }
    
    return { valid: true, invite };
  }
  
  async useDropMapInvite(code: string, territoryId: string) {
    await db
      .update(dropMapInviteCodes)
      .set({ 
        isUsed: true, 
        usedAt: new Date(),
        territoryId 
      })
      .where(eq(dropMapInviteCodes.code, code));
  }
  
  async getDropMapInvites(settingsId: string) {
    return await db
      .select()
      .from(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.settingsId, settingsId))
      .orderBy(desc(dropMapInviteCodes.createdAt));
  }
  
  async deleteDropMapInvite(code: string) {
    await db
      .delete(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.code, code));
  }
  
  async claimTerritoryWithInvite(code: string, territoryId: string) {
    return await db.transaction(async (tx) => {
      // Validate invite
      const validation = await this.validateDropMapInvite(code);
      if (!validation.valid || !validation.invite) {
        throw new Error(validation.error);
      }
      
      const invite = validation.invite;
      
      // Get settings
      const [settings] = await tx
        .select()
        .from(dropMapSettings)
        .where(eq(dropMapSettings.id, invite.settingsId));
      
      if (!settings) throw new Error('DropMap settings not found');
      if (settings.isLocked) throw new Error('Карта заблокирована');
      
      // Get territory with shape
      const [territoryData] = await tx
        .select({
          territory: territories,
          shape: territoryShapes,
        })
        .from(territories)
        .leftJoin(territoryShapes, eq(territories.shapeId, territoryShapes.id))
        .where(eq(territories.id, territoryId));
      
      if (!territoryData) throw new Error('Territory not found');
      if (territoryData.territory.templateId !== settings.templateId) {
        throw new Error('Territory не принадлежит этой карте');
      }
      
      // Check max players per spot
      const currentClaims = await tx
        .select()
        .from(territoryClaims)
        .where(and(
          eq(territoryClaims.territoryId, territoryId),
          isNull(territoryClaims.revokedAt)
        ));
      
      if (currentClaims.length >= settings.maxPlayersPerSpot) {
        throw new Error(`Максимум ${settings.maxPlayersPerSpot} игрок(ов) на локации`);
      }
      
      // Check contested spots limit
      if (currentClaims.length > 0 && settings.maxContestedSpots > 0) {
        const contestedCount = await tx
          .select({ territoryId: territoryClaims.territoryId })
          .from(territoryClaims)
          .leftJoin(territories, eq(territoryClaims.territoryId, territories.id))
          .where(and(
            eq(territories.templateId, settings.templateId),
            isNull(territoryClaims.revokedAt)
          ))
          .groupBy(territoryClaims.territoryId)
          .having(sql`COUNT(*) > 1`);
        
        if (contestedCount.length >= settings.maxContestedSpots) {
          throw new Error(`Достигнут лимит спорных локаций: ${settings.maxContestedSpots}`);
        }
      }
      
      // Update territory color
      await tx
        .update(territories)
        .set({ 
          color: territoryData.shape?.defaultColor || '#3B82F6',
          claimedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(territories.id, territoryId));
      
      // Create claim record (without userId for invite)
      const [claim] = await tx
        .insert(territoryClaims)
        .values({
          territoryId,
          userId: sql`NULL`,
          claimType: 'claim' as any,
          reason: `Клейм по коду: ${invite.displayName}`
        })
        .returning();
      
      // Mark invite as used
      await this.useDropMapInvite(code, territoryId);
      
      return { claim, invite };
    });
  }
  
  // ===== ШАБЛОНЫ КОНТУРОВ =====
  
  async createShape(insertShape: { 
    name: string; 
    points: any; 
    defaultColor: string; 
    description?: string; 
    createdBy?: string 
  }): Promise<TerritoryShape> {
    const [shape] = await db
      .insert(territoryShapes)
      .values({
        name: insertShape.name,
        points: insertShape.points,
        defaultColor: insertShape.defaultColor,
        description: insertShape.description,
        createdBy: insertShape.createdBy,
      })
      .returning();
    return shape;
  }
  
  async getAllShapes(): Promise<any[]> {
    const shapeData = await db
      .select({
        shape: territoryShapes,
        creatorUsername: users.username,
        creatorDisplayName: users.displayName,
      })
      .from(territoryShapes)
      .leftJoin(users, sql`${territoryShapes.createdBy}::text = ${users.id}::text`)
      .orderBy(desc(territoryShapes.createdAt));
    
    return shapeData.map(row => ({
      ...row.shape,
      creator: row.shape.createdBy ? {
        username: row.creatorUsername || '',
        displayName: row.creatorDisplayName || ''
      } : undefined
    }));
  }
  
  async getShape(id: string): Promise<TerritoryShape | undefined> {
    const [shape] = await db
      .select()
      .from(territoryShapes)
      .where(eq(territoryShapes.id, id));
    return shape || undefined;
  }
  
  async updateShape(id: string, updates: Partial<TerritoryShape>): Promise<TerritoryShape | undefined> {
    const [shape] = await db
      .update(territoryShapes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(territoryShapes.id, id))
      .returning();
    return shape || undefined;
  }
  
  async deleteShape(id: string): Promise<void> {
    await db.delete(territoryShapes).where(eq(territoryShapes.id, id));
  }
  
  // ===== ШАБЛОНЫ КАРТ =====
  
  // Замените метод createTemplate в territory-storage.ts:

async createTemplate(insertTemplate: { 
  name: string; 
  description?: string; 
  mapImageUrl?: string; 
  shapeIds: string[];
  tournamentId?: string;
  createdBy?: string 
}): Promise<any> {
  return await db.transaction(async (tx) => {
    // Автоматически добавляем " - Copy" к названию
    const templateName = `${insertTemplate.name} - Copy`;
    
    // Создаем шаблон
    const [template] = await tx
      .insert(territoryTemplates)
      .values({
        name: templateName,
        description: insertTemplate.description,
        mapImageUrl: insertTemplate.mapImageUrl,
        shapeIds: insertTemplate.shapeIds as any,
        tournamentId: insertTemplate.tournamentId,
        createdBy: insertTemplate.createdBy,
      })
      .returning();
    
    // Получаем все контуры
    const shapes = await tx
      .select()
      .from(territoryShapes)
      .where(inArray(territoryShapes.id, insertTemplate.shapeIds));
    
    // Создаем инстансы территорий для каждого контура
    // БЕЗ владельца (ownerId = null), черного цвета
    for (const shape of shapes) {
      await tx.insert(territories).values({
        templateId: template.id,
        shapeId: shape.id,
        name: shape.name,
        color: '#000000', // Черный для незаклеймленных
        priority: 1,
        ownerId: null, // Явно null - нет владельца
        claimedAt: null, // Не заклеймлено
      });
    }
    
    return template;
  });
}
  async getAllTemplatesWithDetails(): Promise<any[]> {
    const templateData = await db
      .select({
        template: territoryTemplates,
        creatorUsername: users.username,
        creatorDisplayName: users.displayName,
        tournamentName: tournaments.name,
        tournamentStatus: tournaments.status,
      })
      .from(territoryTemplates)
      .leftJoin(users, sql`${territoryTemplates.createdBy}::text = ${users.id}::text`)
      .leftJoin(tournaments, sql`${territoryTemplates.tournamentId}::text = ${tournaments.id}::text`)
      .orderBy(desc(territoryTemplates.createdAt));
    
    // Добавляем статистику
    const templatesWithStats = await Promise.all(
      templateData.map(async (row) => {
        const [stats] = await db
          .select({
            territoryCount: sql<number>`COUNT(*)::int`,
            claimedCount: sql<number>`COUNT(CASE WHEN ${territories.ownerId} IS NOT NULL THEN 1 END)::int`,
          })
          .from(territories)
          .where(and(
            sql`${territories.templateId}::text = ${row.template.id}::text`,
            eq(territories.isActive, true)
          ));
        
        return {
          ...row.template,
          territoryCount: Number(stats?.territoryCount || 0),
          claimedCount: Number(stats?.claimedCount || 0),
          creator: row.template.createdBy ? {
            username: row.creatorUsername || '',
            displayName: row.creatorDisplayName || ''
          } : undefined,
          tournament: row.template.tournamentId ? {
            id: row.template.tournamentId,
            name: row.tournamentName || '',
            status: row.tournamentStatus || ''
          } : undefined
        };
      })
    );
    
    return templatesWithStats;
  }
  
  async getTemplateWithShapes(templateId: string): Promise<any> {
    const [template] = await db
      .select()
      .from(territoryTemplates)
      .where(eq(territoryTemplates.id, templateId));
    
    if (!template) return undefined;
    
    const shapeIds = (template.shapeIds as string[]) || [];
    const shapes = shapeIds.length > 0
      ? await db
          .select()
          .from(territoryShapes)
          .where(inArray(territoryShapes.id, shapeIds))
      : [];
    
    return {
      ...template,
      shapes
    };
  }
  
  async getActiveTemplate(): Promise<any> {
    const [template] = await db
      .select()
      .from(territoryTemplates)
      .where(eq(territoryTemplates.isActive, true))
      .limit(1);
    return template || null;
  }
  
  async setActiveTemplate(templateId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Деактивируем все
      await tx
        .update(territoryTemplates)
        .set({ isActive: false, updatedAt: new Date() });
      
      // Активируем нужный
      await tx
        .update(territoryTemplates)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(territoryTemplates.id, templateId));
    });
  }
  
  async deleteTemplate(templateId: string): Promise<void> {
    await db.delete(territoryTemplates).where(eq(territoryTemplates.id, templateId));
  }
  
  // ===== ТЕРРИТОРИИ =====
  
  async getTerritoriesForTemplate(templateId: string, userId?: string): Promise<any[]> {
    const territoryData = await db
      .select({
        territory: territories,
        shape: territoryShapes,
        ownerUsername: users.username,
        ownerDisplayName: users.displayName,
      })
      .from(territories)
      .leftJoin(territoryShapes, eq(territories.shapeId, territoryShapes.id))
      .leftJoin(users, sql`${territories.ownerId}::uuid = ${users.id}::uuid`)
      .where(and(
        eq(territories.templateId, sql`${templateId}::uuid`),
        eq(territories.isActive, true)
      ));

    
    return territoryData.map(row => ({
      id: row.territory.id,
      name: row.territory.name,
      color: row.territory.color,
      points: row.shape?.points || [], // Берем координаты из shape
      ownerId: row.territory.ownerId,
      owner: row.territory.ownerId ? {
        id: row.territory.ownerId,
        username: row.ownerUsername || '',
        displayName: row.ownerDisplayName || ''
      } : undefined,
      claimedAt: row.territory.claimedAt,
      templateId: row.territory.templateId,
      shapeId: row.territory.shapeId,
    }));
  }
  
  async getTerritory(id: string): Promise<Territory | undefined> {
    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, id));
    return territory || undefined;
  }
  
  // ===== КЛЕЙМЫ =====
  
  async claimTerritory(territoryId: string, userId: string): Promise<TerritoryClaim> {
    return await db.transaction(async (tx) => {
      // Получаем территорию с её shape
      const [territoryData] = await tx
        .select({
          territory: territories,
          shape: territoryShapes,
        })
        .from(territories)
        .leftJoin(territoryShapes, eq(territories.shapeId, territoryShapes.id))
        .where(eq(territories.id, sql`${territoryId}::uuid`));
      
      if (!territoryData) throw new Error('Territory not found');
      
      // Освобождаем все предыдущие территории пользователя
      const oldTerritories = await tx
        .select()
        .from(territories)
        .where(and(
          eq(territories.ownerId, sql`${userId}::uuid`),
          eq(territories.isActive, true)
        ));
      
      // Отзываем старые клеймы
      if (oldTerritories.length > 0) {
        await tx
          .update(territoryClaims)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(territoryClaims.userId, sql`${userId}::uuid`),
            isNull(territoryClaims.revokedAt)
          ));
        
        // Создаем записи об освобождении
        for (const oldTerr of oldTerritories) {
          await tx
            .insert(territoryClaims)
            .values({
              territoryId: oldTerr.id,
              userId,
              claimType: 'revoke' as any,
              reason: 'Переклейм на новую территорию'
            });
        }
        
        // Освобождаем старые территории
        await tx
          .update(territories)
          .set({ 
            ownerId: null, 
            color: '#000000',
            claimedAt: null,
            updatedAt: new Date()
          })
          .where(eq(territories.ownerId, userId));
      }
      
      // Клеймим новую территорию с цветом из shape
      await tx
        .update(territories)
        .set({ 
          ownerId: userId,
          color: territoryData.shape?.defaultColor || '#3B82F6',
          claimedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(territories.id, territoryId));
      
      // Создаем запись о клейме
      const [claim] = await tx
        .insert(territoryClaims)
        .values({
          territoryId,
          userId,
          claimType: 'claim' as any,
        })
        .returning();
      
      return claim;
    });
  }
  
  async revokeTerritory(territoryId: string, adminId: string, reason: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [territory] = await tx
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));
      
      if (!territory || !territory.ownerId) {
        throw new Error('Territory not claimed');
      }
      
      // Отзываем клейм
      await tx
        .update(territoryClaims)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(territoryClaims.territoryId, territoryId),
          eq(territoryClaims.userId, territory.ownerId),
          isNull(territoryClaims.revokedAt)
        ));
      
      // Создаем запись об отзыве
      await tx
        .insert(territoryClaims)
        .values({
          territoryId,
          userId: territory.ownerId,
          claimType: 'revoke' as any,
          assignedBy: adminId,
          reason
        });
      
      // Освобождаем территорию
      await tx
        .update(territories)
        .set({ 
          ownerId: null, 
          color: '#000000',
          claimedAt: null,
          updatedAt: new Date()
        })
        .where(eq(territories.id, territoryId));
    });
  }
  
  async getUserTerritories(userId: string): Promise<any[]> {
    const territoryData = await db
      .select({
        territory: territories,
        shape: territoryShapes,
        template: territoryTemplates,
      })
      .from(territories)
      .leftJoin(territoryShapes, eq(territories.shapeId, territoryShapes.id))
      .leftJoin(territoryTemplates, eq(territories.templateId, territoryTemplates.id))
      .where(and(
        eq(territories.ownerId, sql`${userId}::uuid`),
        eq(territories.isActive, true)
      ))
      .orderBy(desc(territories.claimedAt));
    
    return territoryData.map(row => ({
      ...row.territory,
      points: row.shape?.points,
      template: row.template
    }));
  }
  
  // ===== ЛОГИ =====
  
  async getAdminActivityLogs(limit: number = 50): Promise<any[]> {
    const claimLogs = await db
      .select({
        id: territoryClaims.id,
        actionType: territoryClaims.claimType,
        createdAt: territoryClaims.claimedAt,
        userId: territoryClaims.userId,
        territoryId: territoryClaims.territoryId,
        reason: territoryClaims.reason,
        userName: users.username,
        userDisplayName: users.displayName,
        territoryName: territories.name,
        territoryColor: territories.color
      })
      .from(territoryClaims)
      .leftJoin(users, sql`${territoryClaims.userId}::uuid = ${users.id}::uuid`)
      .leftJoin(territories, sql`${territoryClaims.territoryId}::uuid = ${territories.id}::uuid`)
      .orderBy(desc(territoryClaims.claimedAt))
      .limit(limit);
    
    return claimLogs.map(row => ({
      id: `claim_${row.id}`,
      actionType: row.actionType,
      createdAt: row.createdAt,
      userId: row.userId,
      territoryId: row.territoryId,
      territoryName: row.territoryName || 'Удаленная локация',
      territoryColor: row.territoryColor,
      user: {
        username: row.userName || '',
        displayName: row.userDisplayName || 'Неизвестный'
      },
      reason: row.reason,
    }));
  }

 
}

export const territoryStorage = new DatabaseTerritoryStorage();