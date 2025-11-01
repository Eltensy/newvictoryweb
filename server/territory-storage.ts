// server/territory-storage.ts - Исправленная версия

import {
  territories,
  territoryClaims,
  dropMapSettings,
  dropMapEligiblePlayers,
  dropMapInviteCodes,
  tournamentRegistrations,
  tournamentTeams,
  tournamentTeamMembers,
  tournaments,
  users,
  type Territory,
  type TerritoryClaim,
  type DropMapSettings,
  type DropMapEligiblePlayer,
  type DropMapInviteCode,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, inArray } from "drizzle-orm";

const UNCLAIMED_COLOR = '#000000';
const SINGLE_PLAYER_COLOR = '#3B82F6';
const MULTI_PLAYER_COLOR = '#EF4444';

export class DatabaseTerritoryStorage {

  // =============================================
  // ========== MAP METHODS ==========
  // =============================================

  async createEmptyMap(
    name: string,
    description?: string,
    mapImageUrl?: string,
    createdBy?: string,
    tournamentId?: string,
    teamMode?: 'solo' | 'duo' | 'trio' | 'squad'
  ): Promise<DropMapSettings> {
    const [newMap] = await db.insert(dropMapSettings).values({
      name,
      description,
      mapImageUrl,
      createdBy,
      mode: 'tournament',
      tournamentId,
      teamMode
    }).returning();
    if (!newMap) throw new Error('Failed to create map');
    return newMap;
  }

  async createMapFromSourceMap(
    sourceMapId: string,
    name: string,
    description?: string,
    mapImageUrl?: string,
    createdBy?: string,
    tournamentId?: string,
    teamMode?: 'solo' | 'duo' | 'trio' | 'squad'
  ): Promise<DropMapSettings> {
    return db.transaction(async (tx) => {
      const [sourceMap] = await tx
        .select()
        .from(dropMapSettings)
        .where(eq(dropMapSettings.id, sourceMapId));

      if (!sourceMap) {
        throw new Error('Source map not found');
      }

      const [newMap] = await tx.insert(dropMapSettings).values({
        name,
        description,
        mapImageUrl: mapImageUrl || sourceMap.mapImageUrl,
        createdFrom: sourceMapId,
        createdBy,
        mode: 'tournament',
        tournamentId,
        teamMode
      }).returning();
      
      if (!newMap) throw new Error('Failed to create new map');

      const sourceTerritories = await tx
        .select()
        .from(territories)
        .where(eq(territories.mapId, sourceMapId));
      
      if (sourceTerritories.length > 0) {
        await tx.insert(territories).values(
          sourceTerritories.map(t => ({ 
            mapId: newMap.id, 
            name: t.name,
            points: t.points,
            color: UNCLAIMED_COLOR, 
            ownerId: null, 
            claimedAt: null, 
            isActive: true,
            maxPlayers: t.maxPlayers,
            description: t.description,
          }))
        );
      }
      return newMap;
    });
  }

  async getMap(id: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        map: dropMapSettings,
        tournament: tournaments
      })
      .from(dropMapSettings)
      .leftJoin(tournaments, eq(dropMapSettings.tournamentId, tournaments.id))
      .where(eq(dropMapSettings.id, id));

    if (!result) return undefined;

    return {
      ...result.map,
      tournament: result.tournament ? {
        id: result.tournament.id,
        name: result.tournament.name,
      } : null
    };
  }

  async getAllMaps(): Promise<DropMapSettings[]> {
    return db
      .select()
      .from(dropMapSettings)
      .orderBy(desc(dropMapSettings.createdAt));
  }

  private getTerritoryColor(claimCount: number): string {
    if (claimCount === 0) return UNCLAIMED_COLOR;
    if (claimCount === 1) return SINGLE_PLAYER_COLOR;
    return MULTI_PLAYER_COLOR;
  }

  async updateMap(
    id: string, 
    updates: Partial<Omit<DropMapSettings, 'id' | 'createdAt'>>
  ): Promise<DropMapSettings> {
    const [updated] = await db
      .update(dropMapSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dropMapSettings.id, id))
      .returning();
    
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
    // Get map settings to check if it's a tournament map
    const [mapSettings] = await db
      .select()
      .from(dropMapSettings)
      .where(eq(dropMapSettings.id, mapId))
      .limit(1);

    const territoriesData = await db
      .select({
        territory: territories,
        ownerUsername: users.username,
        ownerDisplayName: users.displayName
      })
      .from(territories)
      .leftJoin(users, sql`(${territories.ownerId})::text = (${users.id})::text`)
      .where(eq(territories.mapId, mapId));

    if (territoriesData.length === 0) return [];

    const territoryIds = territoriesData.map(t => t.territory.id);

    const allClaims = await db
      .select({
        claim: territoryClaims,
        user: { username: users.username, displayName: users.displayName, id: users.id },
        invite: dropMapInviteCodes,
        eligiblePlayer: dropMapEligiblePlayers,
      })
      .from(territoryClaims)
      .leftJoin(users, sql`(${territoryClaims.userId})::text = (${users.id})::text`)
      .leftJoin(
        dropMapInviteCodes,
        sql`${territoryClaims.territoryId} = ${dropMapInviteCodes.territoryId}
            AND ${dropMapInviteCodes.isUsed} = true`
      )
      .leftJoin(
        dropMapEligiblePlayers,
        and(
          sql`${dropMapEligiblePlayers.userId}::text = ${territoryClaims.userId}::text`,
          eq(dropMapEligiblePlayers.settingsId, mapId)
        )
      )
      .where(
        and(
          inArray(territoryClaims.territoryId, territoryIds),
          eq(territoryClaims.claimType, 'claim'),
          isNull(territoryClaims.revokedAt)
        )
      );

    // If it's a tournament map with team mode, get team information for all users
    let userTeams: Map<string, { teamId: string; teamName: string; isLeader: boolean }> = new Map();
    if (mapSettings?.tournamentId && mapSettings.teamMode !== 'solo') {
      // Get all teams and their members for this tournament
      const teams = await db
        .select({
          teamId: tournamentTeams.id,
          teamName: tournamentTeams.name,
          leaderId: tournamentTeams.leaderId,
        })
        .from(tournamentTeams)
        .where(eq(tournamentTeams.tournamentId, mapSettings.tournamentId));

      const teamMembers = await db
        .select({
          teamId: tournamentTeamMembers.teamId,
          userId: tournamentTeamMembers.userId,
        })
        .from(tournamentTeamMembers)
        .where(eq(tournamentTeamMembers.status, 'accepted'));

      // Map team leaders
      for (const team of teams) {
        userTeams.set(team.leaderId, {
          teamId: team.teamId,
          teamName: team.teamName,
          isLeader: true,
        });
      }

      // Map team members
      for (const member of teamMembers) {
        const team = teams.find(t => t.teamId === member.teamId);
        if (team && !userTeams.has(member.userId)) {
          userTeams.set(member.userId, {
            teamId: team.teamId,
            teamName: team.teamName,
            isLeader: false,
          });
        }
      }
    }

    const claimsByTerritory: Record<string, any[]> = {};
    const processedTeamsPerTerritory: Record<string, Set<string>> = {}; // Track which teams we've already added to each territory

    for (const row of allClaims) {
      const territoryId = row.claim.territoryId;
      if (!claimsByTerritory[territoryId]) {
        claimsByTerritory[territoryId] = [];
        processedTeamsPerTerritory[territoryId] = new Set();
      }

      let displayName: string;
      let username: string;
      let userId: string;

      // Проверяем, является ли это виртуальным игроком (инвайт)
      const isVirtualPlayer = row.claim.userId?.startsWith('virtual-');

      if (isVirtualPlayer && row.eligiblePlayer) {
        // Виртуальный игрок из инвайта
        userId = row.claim.userId;
        displayName = row.eligiblePlayer.displayName || row.invite?.displayName || 'Инвайтнутый игрок';
        username = 'invite';
      } else if (row.claim.userId === null) {
        // Старые инвайты с userId = null (для обратной совместимости)
        userId = row.invite?.code || `invite-${row.claim.id}`;
        displayName = row.invite?.displayName || 'Инвайтнутый игрок';
        username = 'invite';
      } else if (row.user) {
        // Обычный пользователь
        userId = row.claim.userId;
        displayName = row.user.displayName || 'Неизвестный';
        username = row.user.username || 'unknown';
      } else {
        // Фоллбэк
        userId = row.claim.userId || `anonymous-${row.claim.id}`;
        displayName = 'Неизвестный игрок';
        username = 'unknown';
      }

      // Проверяем teamInfo из реальных команд турнира или из eligiblePlayer (для инвайтов)
      let teamInfo = userTeams.get(userId);
      let virtualTeamId: string | null = null;

      // Если нет команды из турнира, но есть teamId в eligiblePlayer - используем его
      if (!teamInfo && row.eligiblePlayer?.teamId) {
        virtualTeamId = row.eligiblePlayer.teamId;
      }

      // If this user is part of a team and we haven't processed this team for this territory yet
      if (teamInfo && !processedTeamsPerTerritory[territoryId].has(teamInfo.teamId)) {
        // Get all members of this team
        const teamMemberIds = Array.from(userTeams.entries())
          .filter(([_, info]) => info.teamId === teamInfo.teamId)
          .map(([userId]) => userId);

        // Get user info for all team members
        const teamMemberUsers = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(inArray(users.id, teamMemberIds));

        // Add all team members to claims
        for (const memberId of teamMemberIds) {
          const memberInfo = userTeams.get(memberId);
          const memberUser = teamMemberUsers.find(u => u.id === memberId);

          if (memberInfo && !claimsByTerritory[territoryId].find(c => c.userId === memberId)) {
            claimsByTerritory[territoryId].push({
              userId: memberId,
              username: memberUser?.username || 'unknown',
              displayName: memberUser?.displayName || 'Unknown',
              claimedAt: row.claim.claimedAt,
              teamId: memberInfo.teamId,
              teamName: memberInfo.teamName,
              isTeamLeader: memberInfo.isLeader,
            });
          }
        }

        processedTeamsPerTerritory[territoryId].add(teamInfo.teamId);
      } else if (virtualTeamId && !processedTeamsPerTerritory[territoryId].has(virtualTeamId)) {
        // Virtual team (invite-based team)
        // Получаем всех членов виртуальной команды из eligiblePlayers
        const virtualTeamMembers = await db
          .select()
          .from(dropMapEligiblePlayers)
          .where(
            and(
              eq(dropMapEligiblePlayers.settingsId, mapId),
              eq(dropMapEligiblePlayers.teamId, virtualTeamId)
            )
          );

        // Добавляем всех членов команды
        for (const member of virtualTeamMembers) {
          if (!claimsByTerritory[territoryId].find(c => c.userId === member.userId)) {
            claimsByTerritory[territoryId].push({
              userId: member.userId,
              username: 'invite',
              displayName: member.displayName,
              claimedAt: row.claim.claimedAt,
              teamId: virtualTeamId,
              teamName: undefined, // Virtual teams don't have names
              isTeamLeader: member.isTeamLeader || false,
            });
          }
        }

        processedTeamsPerTerritory[territoryId].add(virtualTeamId);
      } else if (!teamInfo && !virtualTeamId) {
        // Solo player (no team)
        const exists = claimsByTerritory[territoryId].find(c => c.userId === userId);
        if (!exists) {
          claimsByTerritory[territoryId].push({
            userId,
            username,
            displayName,
            claimedAt: row.claim.claimedAt,
            teamId: undefined,
            teamName: undefined,
            isTeamLeader: false,
          });
        }
      }
    }

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

  // ========== ОПТИМИЗИРОВАННАЯ ВЕРСИЯ (для больших карт) ==========
  async getMapTerritoriesOptimized(mapId: string): Promise<any[]> {
    // Получаем территории с базовой информацией
    const territoriesData = await db
      .select({ 
        territory: territories, 
        ownerUsername: users.username, 
        ownerDisplayName: users.displayName 
      })
      .from(territories)
      .leftJoin(users, sql`(${territories.ownerId})::text = (${users.id})::text`)
      .where(eq(territories.mapId, mapId));
    
    if (territoriesData.length === 0) return [];
    
    const territoryIds = territoriesData.map(t => t.territory.id);

    // Получаем все claims одним запросом
    const allClaims = await db
      .select({
        claim: territoryClaims,
        user: { username: users.username, displayName: users.displayName },
        invite: dropMapInviteCodes,
        eligiblePlayer: dropMapEligiblePlayers,
      })
      .from(territoryClaims)
      .leftJoin(users, sql`(${territoryClaims.userId})::text = (${users.id})::text`)
      .leftJoin(
        dropMapInviteCodes,
        sql`${territoryClaims.territoryId} = ${dropMapInviteCodes.territoryId}
            AND ${dropMapInviteCodes.isUsed} = true`
      )
      .leftJoin(
        dropMapEligiblePlayers,
        and(
          sql`${dropMapEligiblePlayers.userId}::text = ${territoryClaims.userId}::text`,
          eq(dropMapEligiblePlayers.settingsId, mapId)
        )
      )
      .where(
        and(
          inArray(territoryClaims.territoryId, territoryIds),
          eq(territoryClaims.claimType, 'claim'),
          isNull(territoryClaims.revokedAt)
        )
      );

    // Группируем claims по территориям
    const claimsByTerritory: Record<string, any[]> = {};
    
    for (const row of allClaims) {
      const territoryId = row.claim.territoryId;
      if (!claimsByTerritory[territoryId]) {
        claimsByTerritory[territoryId] = [];
      }
      
      let displayName: string;
      let username: string;
      let userId: string;

      // Проверяем, является ли это виртуальным игроком (инвайт)
      const isVirtualPlayer = row.claim.userId?.startsWith('virtual-');

      if (isVirtualPlayer && row.eligiblePlayer) {
        // Виртуальный игрок из инвайта
        userId = row.claim.userId;
        displayName = row.eligiblePlayer.displayName || row.invite?.displayName || 'Инвайтнутый игрок';
        username = 'invite';
      } else if (row.claim.userId === null) {
        // Старые инвайты с userId = null (для обратной совместимости)
        userId = row.invite?.code || `invite-${row.claim.id}`;
        displayName = row.invite?.displayName || 'Инвайтнутый игрок';
        username = 'invite';
      } else if (row.user) {
        // Обычный пользователь
        userId = row.claim.userId;
        displayName = row.user.displayName || 'Неизвестный';
        username = row.user.username || 'unknown';
      } else {
        // Фоллбэк
        userId = row.claim.userId || `anonymous-${row.claim.id}`;
        displayName = 'Неизвестный игрок';
        username = 'unknown';
      }
      
      // Проверяем дубликаты по userId
      const exists = claimsByTerritory[territoryId].find(c => c.userId === userId);
      if (!exists) {
        claimsByTerritory[territoryId].push({
          userId,
          username,
          displayName,
          claimedAt: row.claim.claimedAt,
          // Добавляем teamId и isTeamLeader из eligiblePlayer или claim
          teamId: row.eligiblePlayer?.teamId || row.claim.teamId || null,
          isTeamLeader: row.eligiblePlayer?.isTeamLeader || row.claim.isTeamLeader || false
        });
      }
    }

    // Собираем финальный результат
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

  async createTerritory(data: { 
    mapId: string; 
    name: string; 
    points: any; 
    color?: string; 
    maxPlayers?: number; 
    description?: string; 
  }): Promise<Territory> {
    const [territory] = await db.insert(territories).values({ 
      mapId: data.mapId, 
      name: data.name, 
      points: data.points, 
      color: UNCLAIMED_COLOR, 
      maxPlayers: data.maxPlayers || 1, 
      description: data.description 
    }).returning();
    return territory;
  }

  async getTerritory(id: string): Promise<Territory | undefined> {
    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, id));
    return territory;
  }

  async updateTerritory(id: string, updates: Partial<Territory>): Promise<Territory> {
    const [updated] = await db
      .update(territories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(territories.id, id))
      .returning();
    
    if (!updated) throw new Error('Territory not found');
    return updated;
  }

  async deleteTerritory(id: string): Promise<void> {
    await db.delete(territories).where(eq(territories.id, id));
  }

  // =============================================
  // ========== PLAYER METHODS ==========
  // =============================================

  async addPlayersToMap(
    mapId: string, 
    userIds: string[], 
    addedBy: string
  ): Promise<{ added: number; skipped: number; errors: string[] }> {
    const usersData = await db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, userIds));
    
    if (usersData.length === 0) {
      return { 
        added: 0, 
        skipped: 0, 
        errors: userIds.map(id => `User ${id} not found`) 
      };
    }
    
    const playersToInsert = usersData.map(u => ({ 
      settingsId: mapId, 
      userId: u.id, 
      displayName: u.displayName, 
      addedBy, 
      sourceType: 'manual' as const
    }));
    
    const inserted = await db
      .insert(dropMapEligiblePlayers)
      .values(playersToInsert)
      .onConflictDoNothing()
      .returning();
    
    return { 
      added: inserted.length, 
      skipped: userIds.length - inserted.length, 
      errors: [] 
    };
  }

  async removePlayerFromMap(mapId: string, userId: string): Promise<void> {
    await db
      .delete(dropMapEligiblePlayers)
      .where(
        and(
          eq(dropMapEligiblePlayers.settingsId, mapId), 
          eq(dropMapEligiblePlayers.userId, userId)
        )
      );
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
    // Check if user is in eligible players list
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

    if (player) return true;

    // Check if map is linked to tournament and user is registered
    const [mapSettings] = await db
      .select()
      .from(dropMapSettings)
      .where(eq(dropMapSettings.id, mapId))
      .limit(1);

    if (mapSettings?.tournamentId) {
      // Check if user is directly registered (solo mode)
      const [registration] = await db
        .select()
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, mapSettings.tournamentId),
            eq(tournamentRegistrations.userId, userId),
            sql`${tournamentRegistrations.status} IN ('registered', 'paid')`
          )
        )
        .limit(1);

      if (registration) return true;

      // Check if user is a team leader with registered team (team mode)
      const [teamLeader] = await db
        .select()
        .from(tournamentTeams)
        .innerJoin(
          tournamentRegistrations,
          eq(tournamentTeams.id, tournamentRegistrations.teamId)
        )
        .where(
          and(
            eq(tournamentTeams.tournamentId, mapSettings.tournamentId),
            eq(tournamentTeams.leaderId, userId),
            sql`${tournamentRegistrations.status} IN ('registered', 'paid')`
          )
        )
        .limit(1);

      if (teamLeader) return true;

      // Check if user is a team member with registered team (team mode)
      const [teamMember] = await db
        .select()
        .from(tournamentTeamMembers)
        .innerJoin(
          tournamentTeams,
          eq(tournamentTeamMembers.teamId, tournamentTeams.id)
        )
        .innerJoin(
          tournamentRegistrations,
          eq(tournamentTeams.id, tournamentRegistrations.teamId)
        )
        .where(
          and(
            eq(tournamentTeams.tournamentId, mapSettings.tournamentId),
            eq(tournamentTeamMembers.userId, userId),
            eq(tournamentTeamMembers.status, 'accepted'),
            sql`${tournamentRegistrations.status} IN ('registered', 'paid')`
          )
        )
        .limit(1);

      if (teamMember) return true;
    }

    return false;
  }

  async isUserTeamLeader(tournamentId: string, userId: string): Promise<boolean> {
    const [team] = await db
      .select()
      .from(tournamentTeams)
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeams.leaderId, userId)
        )
      )
      .limit(1);

    return !!team;
  }

  async getUserTeamId(tournamentId: string, userId: string): Promise<string | null> {
    // Check if user is a team leader
    const [teamAsLeader] = await db
      .select()
      .from(tournamentTeams)
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeams.leaderId, userId)
        )
      )
      .limit(1);

    if (teamAsLeader) return teamAsLeader.id;

    // Check if user is a team member
    const [memberRecord] = await db
      .select({ teamId: tournamentTeamMembers.teamId })
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeamMembers.userId, userId),
          eq(tournamentTeamMembers.status, 'accepted')
        )
      )
      .limit(1);

    return memberRecord?.teamId || null;
  }

  async importPlayersFromTournament(
    mapId: string, 
    tournamentId: string, 
    positions?: number[], 
    topN?: number, 
    addedBy?: string
  ): Promise<DropMapEligiblePlayer[]> {
    let registrations = await db
      .select({ 
        userId: tournamentRegistrations.userId, 
        displayName: users.displayName 
      })
      .from(tournamentRegistrations)
      .innerJoin(users, eq(tournamentRegistrations.userId, users.id))
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId), 
          eq(tournamentRegistrations.status, 'paid')
        )
      )
      .orderBy(tournamentRegistrations.registeredAt);

    if (positions?.length) {
      registrations = registrations.filter((_, i) => positions.includes(i + 1));
    } else if (topN) {
      registrations = registrations.slice(0, topN);
    }
    
    if (!registrations.length) return [];
    
    const playersToInsert = registrations.map(reg => ({ 
      settingsId: mapId, 
      userId: reg.userId, 
      displayName: reg.displayName, 
      addedBy: addedBy || 'system', 
      sourceType: 'tournament_import' as const
    }));
    
    return db
      .insert(dropMapEligiblePlayers)
      .values(playersToInsert)
      .onConflictDoNothing()
      .returning();
  }
  
  // =============================================
  // ========== CLAIM METHODS ==========
  // =============================================

  async claimTerritory(territoryId: string, userId: string): Promise<{ claim: TerritoryClaim; oldTerritoryId?: string }> {
    return db.transaction(async (tx) => {
      // 1. Получаем территорию с блокировкой строки для предотвращения race conditions
      const territoryRows = await tx.execute(sql`
        SELECT
          id,
          map_id as "mapId",
          name,
          points,
          color,
          owner_id as "ownerId",
          claimed_at as "claimedAt",
          max_players as "maxPlayers",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM territories
        WHERE id = ${territoryId}
        FOR UPDATE
      `);

      const territory = territoryRows.rows[0] as any;

      if (!territory) {
        throw new Error('Territory not found');
      }

      // 2. Проверяем старые клеймы пользователя на этой карте
      const oldClaims = await tx
        .select({
          id: territoryClaims.id,
          territoryId: territoryClaims.territoryId
        })
        .from(territoryClaims)
        .innerJoin(territories, eq(territoryClaims.territoryId, territories.id))
        .where(
          and(
            eq(territoryClaims.userId, userId),
            eq(territories.mapId, territory.mapId),
            eq(territoryClaims.claimType, 'claim'),
            isNull(territoryClaims.revokedAt)
          )
        );

      const oldClaim = oldClaims[0];
      let oldTerritoryId: string | undefined;

      // 3. Если у пользователя есть клейм на другой территории этой карты - удаляем его
      if (oldClaim && oldClaim.territoryId !== territoryId) {
        oldTerritoryId = oldClaim.territoryId;
        await tx
          .update(territoryClaims)
          .set({ revokedAt: new Date() })
          .where(eq(territoryClaims.id, oldClaim.id));

        const remainingOnOld = await tx
          .select({ 
            id: territoryClaims.id, 
            userId: territoryClaims.userId 
          })
          .from(territoryClaims)
          .where(
            and(
              eq(territoryClaims.territoryId, oldClaim.territoryId),
              eq(territoryClaims.claimType, 'claim'),
              isNull(territoryClaims.revokedAt)
            )
          )
          .orderBy(territoryClaims.claimedAt);

        const oldTerritoryColor = this.getTerritoryColor(remainingOnOld.length);
        
        if (remainingOnOld.length === 0) {
          await tx
            .update(territories)
            .set({ 
              ownerId: null, 
              claimedAt: null, 
              color: oldTerritoryColor 
            })
            .where(eq(territories.id, oldClaim.territoryId));
        } else {
          const [oldTerritory] = await tx
            .select({ ownerId: territories.ownerId })
            .from(territories)
            .where(eq(territories.id, oldClaim.territoryId));

          if (oldTerritory.ownerId === userId) {
            // Назначаем нового владельца только если это реальный пользователь
            const newOwnerId = remainingOnOld[0].userId;
            const isNewOwnerVirtual = newOwnerId?.startsWith('virtual-');

            const updateData: any = { color: oldTerritoryColor };
            if (!isNewOwnerVirtual && newOwnerId) {
              updateData.ownerId = newOwnerId;
            } else {
              updateData.ownerId = null;
            }

            await tx
              .update(territories)
              .set(updateData)
              .where(eq(territories.id, oldClaim.territoryId));
          } else {
            await tx
              .update(territories)
              .set({ color: oldTerritoryColor })
              .where(eq(territories.id, oldClaim.territoryId));
          }
        }
      }

      // 4. Проверяем текущие клеймы на целевой территории
      const currentClaims = await tx
        .select({
          id: territoryClaims.id,
          userId: territoryClaims.userId
        })
        .from(territoryClaims)
        .where(
          and(
            eq(territoryClaims.territoryId, territoryId),
            eq(territoryClaims.claimType, 'claim'),
            isNull(territoryClaims.revokedAt)
          )
        );

      // Проверка: уже заклеймлено максимум игроков?
      const maxPlayers = territory.maxPlayers || 999;

      // Проверяем, есть ли уже клейм этого пользователя на этой территории
      const userAlreadyOnThisTerritory = currentClaims.some(c => c.userId === userId);

      if (userAlreadyOnThisTerritory) {
        const [existingClaim] = await tx
          .select()
          .from(territoryClaims)
          .where(
            and(
              eq(territoryClaims.territoryId, territoryId),
              eq(territoryClaims.userId, userId),
              isNull(territoryClaims.revokedAt)
            )
          );
        return { claim: existingClaim, oldTerritoryId };
      }

      // Если территория заполнена и пользователя там нет - ошибка
      if (currentClaims.length >= maxPlayers) {
        throw new Error(`Максимум ${maxPlayers} игрок(ов) на локации`);
      }

      // 5. Добавляем новый клейм
      const newClaimCount = currentClaims.length + 1;
      const newColor = this.getTerritoryColor(newClaimCount);

      if (currentClaims.length === 0) {
        // Устанавливаем ownerId только для реальных пользователей (UUID)
        // Для виртуальных игроков (инвайтов) оставляем ownerId = null
        const isVirtualPlayer = userId.startsWith('virtual-');
        const updateData: any = {
          claimedAt: new Date(),
          color: newColor
        };

        if (!isVirtualPlayer) {
          updateData.ownerId = userId;
        }

        await tx
          .update(territories)
          .set(updateData)
          .where(eq(territories.id, territoryId));
      } else {
        await tx
          .update(territories)
          .set({ color: newColor })
          .where(eq(territories.id, territoryId));
      }

      const [newClaim] = await tx
        .insert(territoryClaims)
        .values({
          territoryId,
          userId,
          claimType: 'claim'
        })
        .returning();

      return { claim: newClaim, oldTerritoryId };
    });
  }

  async getUserTerritoryClaimForTerritory(
    territoryId: string, 
    userId: string
  ): Promise<TerritoryClaim | undefined> {
    const [claim] = await db
      .select()
      .from(territoryClaims)
      .where(
        and(
          eq(territoryClaims.territoryId, territoryId), 
          eq(territoryClaims.userId, userId), 
          eq(territoryClaims.claimType, 'claim'), 
          isNull(territoryClaims.revokedAt)
        )
      );
    return claim;
  }

  async removeUserClaim(territoryId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(territoryClaims)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(territoryClaims.territoryId, territoryId), 
            eq(territoryClaims.userId, userId), 
            eq(territoryClaims.claimType, 'claim'), 
            isNull(territoryClaims.revokedAt)
          )
        );
      
      const remaining = await tx
        .select({ userId: territoryClaims.userId })
        .from(territoryClaims)
        .where(
          and(
            eq(territoryClaims.territoryId, territoryId), 
            eq(territoryClaims.claimType, 'claim'), 
            isNull(territoryClaims.revokedAt)
          )
        )
        .orderBy(territoryClaims.claimedAt);
        
      const [currentTerritory] = await tx
        .select({ ownerId: territories.ownerId })
        .from(territories)
        .where(eq(territories.id, territoryId));
      
      const newColor = this.getTerritoryColor(remaining.length);
      
      if (remaining.length === 0) {
        await tx
          .update(territories)
          .set({
            ownerId: null,
            claimedAt: null,
            color: newColor
          })
          .where(eq(territories.id, territoryId));
      } else if (currentTerritory.ownerId === userId) {
        // Назначаем нового владельца только если это реальный пользователь
        const newOwnerId = remaining[0].userId;
        const isNewOwnerVirtual = newOwnerId?.startsWith('virtual-');

        const updateData: any = { color: newColor };
        if (!isNewOwnerVirtual && newOwnerId) {
          updateData.ownerId = newOwnerId;
        } else {
          updateData.ownerId = null;
        }

        await tx
          .update(territories)
          .set(updateData)
          .where(eq(territories.id, territoryId));
      } else {
        await tx
          .update(territories)
          .set({ color: newColor })
          .where(eq(territories.id, territoryId));
      }
    });
  }

  // =============================================
  // ========== INVITE METHODS ==========
  // =============================================

  async createInvite(
    mapId: string,
    displayName: string,
    expiresInDays: number,
    createdBy?: string,
    teamMemberNames?: string | null
  ): Promise<DropMapInviteCode> {
    const code = `invite-${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [invite] = await db
      .insert(dropMapInviteCodes)
      .values({
        settingsId: mapId,
        code,
        displayName,
        teamMemberNames,
        expiresAt,
        createdBy
      })
      .returning();

    return invite;
  }

  async validateInvite(code: string): Promise<{ 
    valid: boolean; 
    error?: string; 
    invite?: DropMapInviteCode 
  }> {
    const [invite] = await db
      .select()
      .from(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.code, code));
    
    if (!invite) return { valid: false, error: 'Код не найден' };
    if (invite.isUsed) return { valid: false, error: 'Код уже использован' };
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return { valid: false, error: 'Срок действия кода истёк' };
    }
    
    return { valid: true, invite };
  }

  async getInvites(mapId: string): Promise<DropMapInviteCode[]> {
    return db
      .select()
      .from(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.settingsId, mapId))
      .orderBy(desc(dropMapInviteCodes.createdAt));
  }

  async deleteInvite(code: string): Promise<void> {
    await db
      .delete(dropMapInviteCodes)
      .where(eq(dropMapInviteCodes.code, code));
  }

  async claimTerritoryWithInvite(
    code: string,
    territoryId: string
  ): Promise<{ claim: TerritoryClaim; invite: DropMapInviteCode }> {
    return db.transaction(async (tx) => {
      const { valid, error, invite } = await this.validateInvite(code);
      if (!valid || !invite) throw new Error(error);

      const [map] = await tx
        .select()
        .from(dropMapSettings)
        .where(eq(dropMapSettings.id, invite.settingsId));

      if (!map) throw new Error('Карта для этого инвайта не найдена');
      if (map.isLocked) throw new Error('Карта заблокирована');

      const [territory] = await tx
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) throw new Error('Territory not found');
      if (territory.mapId !== invite.settingsId) {
        throw new Error('Territory does not belong to this map');
      }

      const currentClaims = await tx
        .select({ id: territoryClaims.id })
        .from(territoryClaims)
        .where(
          and(
            eq(territoryClaims.territoryId, territoryId),
            eq(territoryClaims.claimType, 'claim'),
            isNull(territoryClaims.revokedAt)
          )
        );

      if (currentClaims.length >= (territory.maxPlayers || 999)) {
        throw new Error(`Максимум ${territory.maxPlayers} игрок(ов) на локации`);
      }

      // Парсим список членов команды из JSON
      let teamMembers: string[] = [];
      if (invite.teamMemberNames) {
        try {
          teamMembers = JSON.parse(invite.teamMemberNames);
        } catch (e) {
          console.warn('Failed to parse teamMemberNames:', e);
        }
      }

      // Создаём виртуальные ID для команды
      let virtualPlayerId = invite.virtualPlayerId;
      const timestamp = Date.now();
      const teamId = `team-${invite.code}-${timestamp}`;

      if (!virtualPlayerId) {
        virtualPlayerId = `virtual-invite-${invite.code}-${timestamp}`;

        await tx
          .update(dropMapInviteCodes)
          .set({ virtualPlayerId })
          .where(eq(dropMapInviteCodes.code, code));

        // Добавляем капитана (лидера команды) в список допущенных игроков
        await tx
          .insert(dropMapEligiblePlayers)
          .values({
            settingsId: invite.settingsId,
            userId: virtualPlayerId,
            displayName: invite.displayName,
            sourceType: 'invite',
            addedBy: null,
            teamId: teamMembers.length > 0 ? teamId : null,
            isTeamLeader: teamMembers.length > 0,
          })
          .onConflictDoNothing();

        // Добавляем членов команды в список допущенных игроков
        for (let i = 0; i < teamMembers.length; i++) {
          const memberName = teamMembers[i].trim();
          if (memberName) {
            const memberUserId = `${virtualPlayerId}-member-${i + 1}`;
            await tx
              .insert(dropMapEligiblePlayers)
              .values({
                settingsId: invite.settingsId,
                userId: memberUserId,
                displayName: memberName,
                sourceType: 'invite',
                addedBy: null,
                teamId,
                isTeamLeader: false,
              })
              .onConflictDoNothing();
          }
        }

        // ✅ Invite-based players не добавляются в tournamentRegistrations
        // Они существуют только в dropMapEligiblePlayers, потому что не являются реальными пользователями
        // tournamentRegistrations.userId имеет foreign key на users.id, который требует UUID реального пользователя
      }

      const newClaimCount = currentClaims.length + 1;
      const newColor = this.getTerritoryColor(newClaimCount);

      if (currentClaims.length === 0) {
        await tx
          .update(territories)
          .set({
            color: newColor,
            claimedAt: new Date()
          })
          .where(eq(territories.id, territoryId));
      } else {
        await tx
          .update(territories)
          .set({ color: newColor })
          .where(eq(territories.id, territoryId));
      }

      const [newClaim] = await tx
        .insert(territoryClaims)
        .values({
          territoryId,
          userId: virtualPlayerId,
          claimType: 'claim',
          reason: `Invite: ${invite.displayName} (${invite.code})`,
          teamId: teamMembers.length > 0 ? teamId : null,
          isTeamLeader: teamMembers.length > 0,
        })
        .returning();

      await tx
        .update(dropMapInviteCodes)
        .set({
          isUsed: true,
          usedAt: new Date(),
          territoryId
        })
        .where(eq(dropMapInviteCodes.code, code));

      return { claim: newClaim, invite };
    });
  }

  // ===== Admin & Logging =====
  
  async logAdminActivity(
    adminId: string,
    actionType: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    // Admin activity logging can be implemented here if needed
  }

  async getAdminActivityLogs(limit: number): Promise<any[]> {
    return [];
  }

  // ===== ALIASES FOR BACKWARD COMPATIBILITY =====

  async getDropMapPlayers(mapId: string): Promise<any[]> { 
    return this.getMapPlayers(mapId); 
  }
  
  async removeDropMapPlayer(mapId: string, userId: string): Promise<void> { 
    return this.removePlayerFromMap(mapId, userId); 
  }
  
  async createDropMapInvite(
    mapId: string,
    displayName: string,
    expiresInDays: number,
    createdBy?: string,
    teamMemberNames?: string | null
  ): Promise<DropMapInviteCode> {
    return this.createInvite(mapId, displayName, expiresInDays, createdBy, teamMemberNames);
  }
  
  async getDropMapInvites(mapId: string): Promise<DropMapInviteCode[]> { 
    return this.getInvites(mapId); 
  }
  
  async deleteDropMapInvite(code: string): Promise<void> { 
    return this.deleteInvite(code); 
  }
  
  async validateDropMapInvite(code: string): Promise<{ 
    valid: boolean; 
    error?: string; 
    invite?: DropMapInviteCode 
  }> { 
    return this.validateInvite(code); 
  }
  
  async importDropMapPlayersFromTournament(
    mapId: string, 
    tournamentId: string, 
    positions?: number[], 
    topN?: number, 
    addedBy?: string
  ): Promise<DropMapEligiblePlayer[]> { 
    return this.importPlayersFromTournament(
      mapId, 
      tournamentId, 
      positions, 
      topN, 
      addedBy
    ); 
  }
}

export const territoryStorage = new DatabaseTerritoryStorage();