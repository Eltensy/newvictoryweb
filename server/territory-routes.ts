import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import { territoryStorage } from "./territory-storage";
import { cloudStorage } from './fileStorage';
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { io } from './index';
import { broadcastTerritoryClaim } from './websocket-server';
import { 
  dropMapSettings, 
  dropMapEligiblePlayers, 
  dropMapInviteCodes,
  territories,
  territoryClaims,
  users,
  tournaments,
} from "../shared/schema";
import sharp from 'sharp';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла. Только JPEG, PNG, WebP.'));
    }
  }
});

const authenticateUser = async (req: any): Promise<{ userId: string, user: any } | { error: string, status: number }> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: "Требуется аутентификация", status: 401 };
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp && decoded.exp < Date.now()) {
      return { error: "Токен истёк", status: 401 };
    }
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return { error: "Пользователь не найден", status: 404 };
    }
    return { userId: decoded.userId, user };
  } catch (error) {
    return { error: "Неверный токен", status: 401 };
  }
};

const authenticateAdmin = async (req: any): Promise<{ adminId: string, admin: any } | { error: string, status: number }> => {
  const authResult = await authenticateUser(req);
  if ('error' in authResult) return authResult;
  if (!authResult.user.isAdmin) {
    return { error: "Требуются права администратора", status: 403 };
  }
  return { adminId: authResult.userId, admin: authResult.user };
};

export function registerTerritoryRoutes(app: Express) {
  
  // ========== СИСТЕМЫ КАРТ (DROPMAPS) ==========

  // Получить все карты
  app.get("/api/maps", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const maps = await db
        .select()
        .from(dropMapSettings)
        .orderBy(desc(dropMapSettings.createdAt));

      res.json(maps);
    } catch (error) {
      console.error('Error fetching maps:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Получить одну карту с территориями
  app.get("/api/maps/:mapId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const map = await territoryStorage.getMap(req.params.mapId);
      if (!map) {
        return res.status(404).json({ error: "Карта не найдена" });
      }

      const territoriesData = await territoryStorage.getMapTerritories(req.params.mapId);

      res.json({
        ...map,
        territories: territoriesData,
      });
    } catch (error) {
      console.error('Error fetching map:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Создать новую пустую карту
  app.post("/api/maps", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Название карты обязательно" });
      }

      let mapImageUrl: string | undefined;
      if (req.file) {
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1000, 1000, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: 90 })
          .toBuffer();

        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(resizedBuffer, filename, 'image');
        mapImageUrl = result.secure_url;
      }

      const newMap = await territoryStorage.createEmptyMap(
        name.trim(),
        description,
        mapImageUrl,
        authResult.adminId
      );

      res.json(newMap);
    } catch (error) {
      console.error('Error creating map:', error);
      res.status(500).json({ error: "Не удалось создать карту" });
    }
  });

  // Скопировать карту с территориями
  app.post("/api/maps/copy/:sourceMapId", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { sourceMapId } = req.params;
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Название карты обязательно" });
      }

      const sourceMap = await territoryStorage.getMap(sourceMapId);
      if (!sourceMap) {
        return res.status(404).json({ error: "Исходная карта не найдена" });
      }

      let mapImageUrl: string | undefined;
      if (req.file) {
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1000, 1000, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: 90 })
          .toBuffer();

        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(resizedBuffer, filename, 'image');
        mapImageUrl = result.secure_url;
      }

      const newMap = await territoryStorage.createMapFromSourceMap(
        sourceMapId,
        name.trim(),
        description,
        mapImageUrl,
        authResult.adminId
      );

      res.json(newMap);
    } catch (error) {
      console.error('Error copying map:', error);
      res.status(500).json({ error: "Не удалось скопировать карту" });
    }
  });

  // Обновить карту (название, описание, изображение, настройки)
  app.put("/api/maps/:mapId", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const updates: any = {};

      // Название
      if (req.body.name !== undefined) {
        updates.name = req.body.name?.trim() || null;
      }

      // Описание
      if (req.body.description !== undefined) {
        updates.description = req.body.description;
      }

      // Настройка isLocked
      if (req.body.isLocked !== undefined) {
        updates.isLocked = req.body.isLocked === 'true' || req.body.isLocked === true;
      }

      // Изображение карты
      if (req.file) {
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1000, 1000, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: 90 })
          .toBuffer();

        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(resizedBuffer, filename, 'image');
        updates.mapImageUrl = result.secure_url;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();

        const [updated] = await db
          .update(dropMapSettings)
          .set(updates)
          .where(eq(dropMapSettings.id, req.params.mapId))
          .returning();

        res.json(updated);
      } else {
        const [existingMap] = await db
          .select()
          .from(dropMapSettings)
          .where(eq(dropMapSettings.id, req.params.mapId));
        
        res.json(existingMap);
      }
    } catch (error) {
      console.error('Error updating map:', error);
      res.status(500).json({ error: "Не удалось обновить карту" });
    }
  });

  // Удалить карту
  app.delete("/api/maps/:mapId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const map = await territoryStorage.getMap(req.params.mapId);
      if (!map) {
        return res.status(404).json({ error: "Карта не найдена" });
      }

      await territoryStorage.deleteMap(req.params.mapId);

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_delete_map',
        `Администратор удалил карту "${map.name}"`,
        { mapId: req.params.mapId, mapName: map.name }
      );

      res.json({ message: "Карта успешно удалена", deletedId: req.params.mapId });
    } catch (error) {
      console.error('Error deleting map:', error);
      res.status(500).json({ error: "Не удалось удалить карту" });
    }
  });

  // ========== ТЕРРИТОРИИ ==========

  // Получить территории карты
  app.get("/api/maps/:mapId/territories", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const territoriesData = await territoryStorage.getMapTerritories(req.params.mapId);
      res.json(territoriesData);
    } catch (error) {
      console.error('Error fetching territories:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Добавить территорию на карту
  app.post("/api/maps/:mapId/territories", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { name, points, description, maxPlayers } = req.body;

      if (!name || !points || points.length < 3) {
        return res.status(400).json({
          error: "Название и минимум 3 точки обязательны"
        });
      }

      const [territory] = await db
        .insert(territories)
        .values({
          mapId: req.params.mapId,
          name,
          points,
          color: '#000000',
          maxPlayers: maxPlayers || 1,
          description,
        })
        .returning();

      res.json(territory);
    } catch (error) {
      console.error('Error creating territory:', error);
      res.status(500).json({ error: "Не удалось создать территорию" });
    }
  });

  // Обновить территорию
  app.put("/api/territories/:territoryId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { name, color, description, maxPlayers } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (description !== undefined) updates.description = description;
      if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;

      const [updated] = await db
        .update(territories)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(territories.id, req.params.territoryId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error('Error updating territory:', error);
      res.status(500).json({ error: "Не удалось обновить территорию" });
    }
  });

  // Удалить территорию
  app.delete("/api/territories/:territoryId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, req.params.territoryId));

      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(territoryClaims)
          .where(eq(territoryClaims.territoryId, req.params.territoryId));

        await tx
          .delete(territories)
          .where(eq(territories.id, req.params.territoryId));
      });

      res.json({ message: "Территория успешно удалена" });
    } catch (error) {
      console.error('Error deleting territory:', error);
      res.status(500).json({ error: "Не удалось удалить территорию" });
    }
  });

  // ========== КЛЕЙМЫ ==========

  // Заклеймить территорию
  app.post("/api/territories/:territoryId/claim", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { territoryId } = req.params;

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }

      if (!territory.isActive) {
        return res.status(400).json({ error: "Территория неактивна" });
      }

      // Проверка доступа к карте
      const isEligible = await territoryStorage.isUserEligibleForMap(territory.mapId, authResult.userId);
      if (!isEligible && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Вы не в списке допущенных игроков для этой карты" });
      }

      const result = await territoryStorage.claimTerritory(territoryId, authResult.userId);

      console.log('🔍 [Claim] About to broadcast, io exists:', !!io, 'mapId:', territory.mapId, 'territoryId:', territoryId, 'oldTerritoryId:', result.oldTerritoryId);

      if (io) {
        // Broadcast для новой территории
        await broadcastTerritoryClaim(io, territory.mapId, territoryId);
        console.log('✅ [Claim] Broadcast completed for new territory');

        // Если была старая территория - broadcast и для неё
        if (result.oldTerritoryId) {
          await broadcastTerritoryClaim(io, territory.mapId, result.oldTerritoryId);
          console.log('✅ [Claim] Broadcast completed for old territory');
        }
      } else {
        console.error('❌ [Claim] io is null, cannot broadcast!');
      }

      res.json({ message: "Территория успешно заклеймлена", claim: result.claim, immediate: true });
    } catch (error: any) {
      console.error('Error claiming territory:', error);
      res.status(500).json({ error: error.message || "Не удалось заклеймить территорию" });
    }
  });

  // ========== ИГРОКИ (DROPMAP) ==========

  // Добавить игроков на карту
  app.post("/api/maps/:mapId/players", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { mapId } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "userIds array is required" });
      }

      const [map] = await db
        .select()
        .from(dropMapSettings)
        .where(eq(dropMapSettings.id, mapId));

      if (!map) {
        return res.status(404).json({ error: "Карта не найдена" });
      }

      const results = {
        added: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            results.errors.push(`User ${userId} not found`);
            continue;
          }

          const [existing] = await db
            .select()
            .from(dropMapEligiblePlayers)
            .where(and(
              eq(dropMapEligiblePlayers.settingsId, mapId),
              eq(dropMapEligiblePlayers.userId, userId)
            ));

          if (existing) {
            results.skipped++;
            continue;
          }

          await db
            .insert(dropMapEligiblePlayers)
            .values({
              settingsId: mapId,
              userId: userId,
              displayName: user.displayName,
              sourceType: 'manual',
              addedBy: authResult.adminId,
            });

          results.added++;
        } catch (error) {
          console.error(`Failed to add player ${userId}:`, error);
          results.errors.push(`Failed to add ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Added ${results.added} players`,
        added: results.added,
        skipped: results.skipped,
        errors: results.errors,
      });
    } catch (error) {
      console.error('Add players error:', error);
      res.status(500).json({
        error: "Failed to add players",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Получить игроков карты
  app.get("/api/maps/:mapId/players", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const players = await territoryStorage.getDropMapPlayers(req.params.mapId);
      res.json(players);
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Удалить игрока с карты
  app.delete("/api/maps/:mapId/players/:userId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      await territoryStorage.removeDropMapPlayer(req.params.mapId, req.params.userId);
      res.json({ message: "Игрок удален" });
    } catch (error) {
      console.error('Error removing player:', error);
      res.status(500).json({ error: "Не удалось удалить игрока" });
    }
  });

  // ========== ИНВАЙТ КОДЫ ==========

  // Создать инвайт код
  app.post("/api/maps/:mapId/invites", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { displayName, expiresInDays } = req.body;

      const invite = await territoryStorage.createDropMapInvite(
        req.params.mapId,
        displayName,
        expiresInDays || 30,
        authResult.adminId
      );

      res.json(invite);
    } catch (error) {
      console.error('Error creating invite:', error);
      res.status(500).json({ error: "Не удалось создать код" });
    }
  });

  // Получить инвайты карты
  app.get("/api/maps/:mapId/invites", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const invites = await territoryStorage.getDropMapInvites(req.params.mapId);
      res.json(invites);
    } catch (error) {
      console.error('Error fetching invites:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Удалить инвайт код
  app.delete("/api/invites/:code", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      await territoryStorage.deleteDropMapInvite(req.params.code);
      res.json({ message: "Код удален" });
    } catch (error) {
      console.error('Error deleting invite:', error);
      res.status(500).json({ error: "Не удалось удалить код" });
    }
  });

  // Валидировать инвайт код
  app.get("/api/invites/:code", async (req, res) => {
    try {
      const validation = await territoryStorage.validateDropMapInvite(req.params.code);

      if (!validation.valid || !validation.invite) {
        return res.status(400).json({ error: validation.error });
      }

      const invite = validation.invite;
      const map = await territoryStorage.getMap(invite.settingsId);

      if (!map) {
        return res.status(404).json({ error: "Карта не найдена" });
      }

      res.json({
        valid: true,
        displayName: invite.displayName,
        map: {
          id: map.id,
          name: map.name,
          mapImageUrl: map.mapImageUrl,
        },
        mapId: map.id,
      });
    } catch (error) {
      console.error('Error validating invite:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });


  // ========== АДМИНИСТРАТИВСКИЕ ФУНКЦИИ ==========

  // Администратор добавляет игрока на территорию
  app.post("/api/admin/territories/:territoryId/assign-player", async (req, res) => {
    try {
      console.log('🔵 [Admin Assign] Request received:', {
        territoryId: req.params.territoryId,
        userId: req.body.userId
      });

      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        console.error('❌ [Admin Assign] Auth failed:', authResult.error);
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { territoryId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        console.error('❌ [Admin Assign] Missing userId');
        return res.status(400).json({ error: "Требуется userId" });
      }

      console.log('🔍 [Admin Assign] Looking for territory:', territoryId);
      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) {
        console.error('❌ [Admin Assign] Territory not found:', territoryId);
        return res.status(404).json({ error: "Территория не найдена" });
      }

      console.log('✅ [Admin Assign] Territory found:', territory.name);

      // Проверяем, является ли это виртуальным игроком (инвайт) или реальным пользователем
      const isVirtualPlayer = userId.startsWith('virtual-');
      let displayName: string;

      if (isVirtualPlayer) {
        // Получаем displayName из dropMapEligiblePlayers
        const [eligiblePlayer] = await db
          .select()
          .from(dropMapEligiblePlayers)
          .where(and(
            eq(dropMapEligiblePlayers.userId, userId),
            eq(dropMapEligiblePlayers.settingsId, territory.mapId)
          ));

        if (!eligiblePlayer) {
          console.error('❌ [Admin Assign] Virtual player not found in eligible players:', userId);
          return res.status(404).json({ error: "Игрок не найден" });
        }
        displayName = eligiblePlayer.displayName || 'Инвайтнутый игрок';
        console.log('✅ [Admin Assign] Virtual player found:', displayName);
      } else {
        const user = await storage.getUser(userId);
        if (!user) {
          console.error('❌ [Admin Assign] User not found:', userId);
          return res.status(404).json({ error: "Пользователь не найден" });
        }
        displayName = user.displayName;
        console.log('✅ [Admin Assign] User found:', displayName);
      }

      const existingClaim = await territoryStorage.getUserTerritoryClaimForTerritory(territoryId, userId);
      if (existingClaim) {
        console.warn('⚠️ [Admin Assign] User already has claim');
        return res.status(400).json({ error: "Этот игрок уже заклеймил эту локацию" });
      }

      console.log('🎯 [Admin Assign] Claiming territory...');
      const result = await territoryStorage.claimTerritory(territoryId, userId);

      console.log('✅ [Admin Assign] Claim successful, broadcasting...');

      // Broadcast для новой территории
      if (io) {
        await broadcastTerritoryClaim(io, territory.mapId, territoryId);
        // Если была старая территория - broadcast и для неё
        if (result.oldTerritoryId) {
          await broadcastTerritoryClaim(io, territory.mapId, result.oldTerritoryId);
        }
      }

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_assign',
        `Администратор добавил ${displayName} на территорию "${territory.name}"`,
        {
          territoryId,
          territoryName: territory.name,
          userId,
          userName: displayName,
        }
      );

      console.log('✅ [Admin Assign] Complete');

      res.json({
        message: "Игрок добавлен на территорию",
        claim: result.claim,
      });
    } catch (error) {
      console.error('❌ [Admin Assign] Error:', error);
      res.status(500).json({ error: "Не удалось назначить игрока" });
    }
  });

  // Администратор удаляет игрока с территории
  app.post("/api/admin/territories/:territoryId/remove-player", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { territoryId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Требуется userId" });
      }

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }

      const claim = await territoryStorage.getUserTerritoryClaimForTerritory(territoryId, userId);
      if (!claim) {
        return res.status(400).json({ error: "Этот игрок не заклеймил эту территорию" });
      }

      // Проверяем, является ли это виртуальным игроком (инвайт) или реальным пользователем
      const isVirtualPlayer = userId.startsWith('virtual-');
      let displayName: string;

      if (isVirtualPlayer) {
        // Получаем displayName из dropMapEligiblePlayers
        const [eligiblePlayer] = await db
          .select()
          .from(dropMapEligiblePlayers)
          .where(and(
            eq(dropMapEligiblePlayers.userId, userId),
            eq(dropMapEligiblePlayers.settingsId, territory.mapId)
          ));
        displayName = eligiblePlayer?.displayName || 'Инвайтнутый игрок';
      } else {
        const user = await storage.getUser(userId);
        displayName = user?.displayName || 'игрок';
      }

      await territoryStorage.removeUserClaim(territoryId, userId);

      // Broadcast обновление территории
      if (io) {
        await broadcastTerritoryClaim(io, territory.mapId, territoryId);
        console.log('✅ [Admin Remove] Broadcast sent');
      }

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_remove',
        `Администратор убрал ${displayName} с территории "${territory.name}"`,
        {
          territoryId,
          territoryName: territory.name,
          userId,
          userName: displayName,
        }
      );

      res.json({
        message: "Игрок убран с территории",
      });
    } catch (error) {
      console.error('❌ [Admin Remove] Error:', error);
      res.status(500).json({ error: "Не удалось убрать игрока" });
    }
  });

  // ========== ИМПОРТ ИГРОКОВ (из турниров) ==========

  // Импортировать игроков с турнира
  app.post("/api/maps/:mapId/import-players-from-tournament", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { mapId } = req.params;
      const { tournamentId, positions, topN } = req.body;

      const map = await territoryStorage.getMap(mapId);
      if (!map) {
        return res.status(404).json({
          error: "Карта не найдена",
          mapId
        });
      }

      const added = await territoryStorage.importDropMapPlayersFromTournament(
        mapId,
        tournamentId,
        positions,
        topN,
        authResult.adminId
      );

      res.json({ added: added.length, players: added });
    } catch (error) {
      console.error('Error importing players:', error);
      res.status(500).json({
        error: "Не удалось импортировать игроков",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========== ЛОГИ И СТАТИСТИКА ==========

  // Получить логи активности администраторов
  app.get("/api/admin/activity-logs", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await territoryStorage.getAdminActivityLogs(limit);

      res.json(logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Получить статистику пользователя
  app.get("/api/user/territory-stats/:userId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const userTerritories = await db
        .select()
        .from(territories)
        .where(and(
          eq(territories.ownerId, req.params.userId),
          eq(territories.isActive, true)
        ));

      const stats = {
        currentTerritories: userTerritories.length,
        totalClaims: userTerritories.length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // ========== ПОЛУЧИТЬ СПИСОК ТУРНИРОВ (для импорта) ==========

  app.get("/api/admin/tournaments", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const tournamentsList = await db
        .select()
        .from(tournaments)
        .orderBy(desc(tournaments.createdAt));

      res.json(tournamentsList);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // ========== ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (для добавления на карту) ==========


  // ========== СТАРЫЕ РОУТЫ ДЛЯ СОВМЕСТИМОСТИ (LEGACY) ==========

  // Legacy: Получить все дропмапы
  app.get("/api/dropmaps", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const maps = await db
        .select()
        .from(dropMapSettings)
        .orderBy(desc(dropMapSettings.createdAt));

      res.json(maps.map(settings => ({
        ...settings,
        tournament: null, 
      })));
    } catch (error) {
      console.error('Error fetching dropmaps:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Legacy: Создать дропмап
  app.post("/api/dropmap/settings", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { sourceDropMapId, customName, mapImageUrl, tournamentId } = req.body;

      if (!customName || !customName.trim()) {
        return res.status(400).json({ error: "Название карты обязательно" });
      }

      await db.transaction(async (tx) => {
        const [newDropMap] = await tx
          .insert(dropMapSettings)
          .values({
            name: customName.trim(),
            mapImageUrl: mapImageUrl || null,
            tournamentId: tournamentId || null,
            mode: 'tournament',
            createdBy: authResult.adminId,
          })
          .returning();

        if (sourceDropMapId) {
          const sourceTerritories = await tx
            .select()
            .from(territories)
            .where(eq(territories.mapId, sourceDropMapId));

          if (sourceTerritories.length > 0) {
            await tx.insert(territories).values(
              sourceTerritories.map(t => ({
                mapId: newDropMap.id,
                name: t.name,
                points: t.points,
                color: '#808080',
                ownerId: null,
                claimedAt: null,
                isActive: true,
                maxPlayers: t.maxPlayers,
                description: t.description,
              }))
            );
          }
        }

        res.json(newDropMap);
      });
    } catch (error) {
      console.error('Error creating dropmap:', error);
      res.status(500).json({ error: "Не удалось создать карту" });
    }
  });

  // Legacy: Обновить настройки дропмапа
  app.put("/api/dropmap/settings/:id", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const updates: any = {};

      if (req.body.customName !== undefined) {
        updates.name = req.body.customName?.trim() || null;
      }

      if (req.body.isLocked !== undefined) {
        updates.isLocked = req.body.isLocked === 'true' || req.body.isLocked === true;
      }

      if (req.file) {
        const resizedBuffer = await sharp(req.file.buffer)
          .resize(1000, 1000, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: 90 })
          .toBuffer();

        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(resizedBuffer, filename, 'image');
        updates.mapImageUrl = result.secure_url;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();

        const [updated] = await db
          .update(dropMapSettings)
          .set(updates)
          .where(eq(dropMapSettings.id, req.params.id))
          .returning();

        res.json(updated);
      } else {
        res.json({ message: "Настройки обновлены" });
      }
    } catch (error) {
      console.error('Error updating dropmap:', error);
      res.status(500).json({ error: "Не удалось обновить настройки" });
    }
  });

  // Legacy: Добавить игроков
  app.post("/api/dropmap/:id/players", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { id: dropMapId } = req.params;
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "userIds array is required" });
      }

      const [dropMap] = await db
        .select()
        .from(dropMapSettings)
        .where(eq(dropMapSettings.id, dropMapId));

      if (!dropMap) {
        return res.status(404).json({ error: "Карта не найдена" });
      }

      const results = {
        added: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            results.errors.push(`User ${userId} not found`);
            continue;
          }

          const [existing] = await db
            .select()
            .from(dropMapEligiblePlayers)
            .where(and(
              eq(dropMapEligiblePlayers.settingsId, dropMapId),
              eq(dropMapEligiblePlayers.userId, userId)
            ));

          if (existing) {
            results.skipped++;
            continue;
          }

          await db
            .insert(dropMapEligiblePlayers)
            .values({
              settingsId: dropMapId,
              userId: userId,
              displayName: user.displayName,
              sourceType: 'manual',
              addedBy: authResult.adminId,
            });

          results.added++;
        } catch (error) {
          console.error(`Failed to add player ${userId}:`, error);
          results.errors.push(`Failed to add ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Added ${results.added} players`,
        added: results.added,
        skipped: results.skipped,
        errors: results.errors,
      });
    } catch (error) {
      console.error('Add players error:', error);
      res.status(500).json({
        error: "Failed to add players",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy: Добавить территорию
  app.post("/api/dropmap/:id/territories", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { id: dropMapId } = req.params;
      const { name, points, maxPlayers, description } = req.body;

      if (!name || !points || points.length < 3) {
        return res.status(400).json({ error: "Название и минимум 3 точки обязательны" });
      }

      const [territory] = await db
        .insert(territories)
        .values({
          mapId: dropMapId,
          name,
          points: points as any,
          color: '#374151',
          maxPlayers: maxPlayers || 1,
          description,
        })
        .returning();

      res.json(territory);
    } catch (error) {
      console.error('Error creating territory:', error);
      res.status(500).json({ error: "Не удалось создать локацию" });
    }
  });

  // Legacy: Получить территории
  app.get("/api/dropmap/:id/territories", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const territoriesData = await territoryStorage.getMapTerritories(req.params.id);
      res.json(territoriesData);
    } catch (error) {
      console.error('Error fetching territories:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Legacy: Удалить дропмап
  app.delete("/api/dropmap/settings/:id", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const dropMapId = req.params.id;

      const settings = await territoryStorage.getMap(dropMapId);
      if (!settings) {
        return res.status(404).json({ error: "DropMap не найдена" });
      }

      await territoryStorage.deleteMap(dropMapId);

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_delete_dropmap',
        `Администратор удалил DropMap: "${settings.name || 'Безымянная карта'}"`,
        {
          dropMapId,
          dropMapName: settings.name || 'Безымянная карта',
        }
      );

      res.json({
        message: "DropMap успешно удалена",
        deletedId: dropMapId
      });
    } catch (error) {
      console.error('Error deleting dropmap settings:', error);
      res.status(500).json({
        error: "Не удалось удалить карту",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy: Получить игроков
  app.get("/api/dropmap/settings/:id/players", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const players = await territoryStorage.getDropMapPlayers(req.params.id);
      res.json(players);
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Legacy: Удалить игрока
  app.delete("/api/dropmap/settings/:id/players/:userId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      await territoryStorage.removeDropMapPlayer(req.params.id, req.params.userId);
      res.json({ message: "Игрок удален" });
    } catch (error) {
      console.error('Error removing player:', error);
      res.status(500).json({ error: "Не удалось удалить игрока" });
    }
  });

  // Legacy: Инвайты
  app.post("/api/dropmap/settings/:id/invites", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { displayName, expiresInDays } = req.body;

      const invite = await territoryStorage.createDropMapInvite(
        req.params.id,
        displayName,
        expiresInDays || 30,
        authResult.adminId
      );

      res.json(invite);
    } catch (error) {
      console.error('Error creating invite:', error);
      res.status(500).json({ error: "Не удалось создать код" });
    }
  });

  app.get("/api/dropmap/settings/:id/invites", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const invites = await territoryStorage.getDropMapInvites(req.params.id);
      res.json(invites);
    } catch (error) {
      console.error('Error fetching invites:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.delete("/api/dropmap/invites/:code", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      await territoryStorage.deleteDropMapInvite(req.params.code);
      res.json({ message: "Код удален" });
    } catch (error) {
      console.error('Error deleting invite:', error);
      res.status(500).json({ error: "Не удалось удалить код" });
    }
  });

app.get("/api/dropmap/invite/:code", async (req, res) => {
  try {
    const validation = await territoryStorage.validateDropMapInvite(req.params.code);

    if (!validation.valid || !validation.invite) {
      return res.status(400).json({ error: validation.error });
    }

    const invite = validation.invite;
    const map = await territoryStorage.getMap(invite.settingsId);

    if (!map) {
      return res.status(404).json({ error: "Карта не найдена" });
    }

    res.json({
      valid: true,
      displayName: invite.displayName,
      map: {
        id: map.id,
        name: map.name,
        mapImageUrl: map.mapImageUrl,
      },
      settingsId: map.id,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

app.get("/api/maps/:mapId/full-data", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { mapId } = req.params;
    const userId = authResult.userId;
    const isAdmin = authResult.user.isAdmin;

    // ✅ ПАРАЛЛЕЛЬНАЯ загрузка всех данных
    const [map, territories, eligiblePlayers, isEligible, invites] = await Promise.all([
      db.select().from(dropMapSettings).where(eq(dropMapSettings.id, mapId)).limit(1),
      
      // 2. Территории с claims (оптимизированный запрос)
      territoryStorage.getMapTerritories(mapId),
      
      // 3. Список игроков
      db.select().from(dropMapEligiblePlayers)
        .leftJoin(users, eq(dropMapEligiblePlayers.userId, users.id))
        .where(eq(dropMapEligiblePlayers.settingsId, mapId))
        .orderBy(desc(dropMapEligiblePlayers.addedAt)),
      
      // 4. Проверка eligibility текущего юзера (одним запросом)
      db.select({ count: sql`count(*)` })
        .from(dropMapEligiblePlayers)
        .where(and(
          eq(dropMapEligiblePlayers.settingsId, mapId),
          eq(dropMapEligiblePlayers.userId, userId)
        ))
        .then(r => r[0]?.count > 0),
      
      // 5. Инвайты (только для админа, иначе пустой массив)
      isAdmin 
        ? db.select().from(dropMapInviteCodes)
            .where(eq(dropMapInviteCodes.settingsId, mapId))
            .orderBy(desc(dropMapInviteCodes.createdAt))
        : Promise.resolve([])
    ]);

    const [mapData] = map;
    if (!mapData) {
      return res.status(404).json({ error: "Карта не найдена" });
    }

    console.log('📦 [Full Data] Eligible players raw sample:',
      eligiblePlayers.slice(0, 2).map(p => ({
        keys: Object.keys(p),
        data: p
      }))
    );

    res.json({
      map: mapData,
      territories,
      eligiblePlayers: eligiblePlayers.map(p => {
        // Явно извлекаем поля из joined таблиц
        const player = p.dropmap_eligible_players || p.dropMapEligiblePlayers;
        const userInfo = p.users;

        return {
          id: player?.id,
          userId: player?.userId || player?.user_id,
          displayName: player?.displayName || player?.display_name,
          sourceType: player?.sourceType || player?.source_type,
          addedAt: player?.addedAt || player?.added_at,
          user: userInfo ? {
            id: userInfo.id,
            username: userInfo.username,
            displayName: userInfo.displayName || userInfo.display_name
          } : null
        };
      }),
      isUserEligible: isEligible,
      inviteCodes: invites
    });
  } catch (error) {
    console.error('Error fetching full map data:', error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});



app.get("/api/maps/:mapId/territories/public", async (req, res) => {
  try {
    const territoriesData = await territoryStorage.getMapTerritories(req.params.mapId);
    res.json(territoriesData);
  } catch (error) {
    console.error('Error fetching territories:', error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Заклеймить территорию по инвайту (БЕЗ АУТЕНТИФИКАЦИИ)
app.post("/api/claim-with-invite", async (req, res) => {
  try {
    const { code, territoryId } = req.body;

    if (!code || !territoryId) {
      return res.status(400).json({ error: "Код и ID территории обязательны" });
    }

    const result = await territoryStorage.claimTerritoryWithInvite(code, territoryId);

    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, territoryId));

    console.log('🔍 [Claim Invite] About to broadcast, io exists:', !!io, 'territory exists:', !!territory, 'mapId:', territory?.mapId);

    if (territory && io) {
      await broadcastTerritoryClaim(io, territory.mapId, territoryId);
      console.log('✅ [Claim Invite] Broadcast completed');
    } else {
      console.warn('⚠️ WebSocket broadcast skipped - missing territory or io');
    }

    res.json({
      message: "Локация заклеймлена",
      claim: result.claim,
      displayName: result.invite.displayName
    });
  } catch (error: any) {
    console.error('Error claiming with invite:', error);
    res.status(500).json({ error: error.message || "Не удалось поставить метку" });
  }
});


  app.post("/api/dropmap/settings/:id/import-players", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const settingsId = req.params.id;
      const { tournamentId, positions, topN } = req.body;

      const settings = await territoryStorage.getMap(settingsId);
      if (!settings) {
        return res.status(404).json({
          error: "DropMap настройки не найдены",
          settingsId
        });
      }

      const added = await territoryStorage.importDropMapPlayersFromTournament(
        settingsId,
        tournamentId,
        positions,
        topN,
        authResult.adminId
      );

      res.json({ added: added.length, players: added });
    } catch (error) {
      console.error('Error importing players:', error);
      res.status(500).json({
        error: "Не удалось импортировать игроков",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Legacy: Старые роуты администратора
  app.post("/api/territory/admin-assign", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { territoryId, userId } = req.body;

      if (!territoryId || !userId) {
        return res.status(400).json({ error: "Требуются territoryId и userId" });
      }

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const existingClaim = await territoryStorage.getUserTerritoryClaimForTerritory(territoryId, userId);
      if (existingClaim) {
        return res.status(400).json({ error: "Этот игрок уже заклеймил эту локацию" });
      }

      const claim = await territoryStorage.claimTerritory(territoryId, userId);

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_assign',
        `Администратор добавил ${user.displayName} на локацию "${territory.name}"`,
        {
          territoryId,
          territoryName: territory.name,
          userId,
          userName: user.displayName,
        }
      );

      res.json({
        message: "Игрок добавлен на локацию",
        claim,
      });
    } catch (error) {
      console.error('Error assigning player to territory:', error);
      res.status(500).json({ error: "Не удалось назначить игрока" });
    }
  });

  app.post("/api/territory/admin-remove", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { territoryId, userId } = req.body;

      if (!territoryId || !userId) {
        return res.status(400).json({ error: "Требуются territoryId и userId" });
      }

      const [territory] = await db
        .select()
        .from(territories)
        .where(eq(territories.id, territoryId));

      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }

      const claim = await territoryStorage.getUserTerritoryClaimForTerritory(territoryId, userId);
      if (!claim) {
        return res.status(400).json({
          error: "Этот игрок не заклеймил эту территорию"
        });
      }

      const user = await storage.getUser(userId);

      await territoryStorage.removeUserClaim(territoryId, userId);

      await territoryStorage.logAdminActivity(
        authResult.adminId,
        'admin_remove',
        `Администратор убрал ${user?.displayName || 'игрока'} с локации "${territory.name}"`,
        {
          territoryId,
          territoryName: territory.name,
          userId,
          userName: user?.displayName,
        }
      );

      res.json({
        message: "Игрок убран с локации",
      });
    } catch (error) {
      console.error('Error removing player from territory:', error);
      res.status(500).json({ error: "Не удалось убрать игрока" });
    }
  });
}