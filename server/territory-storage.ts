// server/territory-storage.ts - ПОЛНАЯ ОПТИМИЗИРОВАННАЯ ВЕРСИЯ

import {
  territoryShapes,
  territoryTemplates,
  territories,
  territoryClaims,
  users,
  tournaments,
  type TerritoryShape,
  type Territory,
  type TerritoryClaim,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, inArray, or } from "drizzle-orm";

export interface ITerritoryStorage {
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
}

export class DatabaseTerritoryStorage implements ITerritoryStorage {
  
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
  
  async createTemplate(insertTemplate: { 
    name: string; 
    description?: string; 
    mapImageUrl?: string; 
    shapeIds: string[];
    tournamentId?: string;
    createdBy?: string 
  }): Promise<any> {
    return await db.transaction(async (tx) => {
      // Создаем шаблон
      const [template] = await tx
        .insert(territoryTemplates)
        .values({
          name: insertTemplate.name,
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
      for (const shape of shapes) {
        await tx.insert(territories).values({
          templateId: template.id,
          shapeId: shape.id,
          name: shape.name,
          color: '#000000', // Черный для незаклеймленных
          priority: 1,
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