// server/territory-routes.ts - ПОЛНЫЕ ОПТИМИЗИРОВАННЫЕ МАРШРУТЫ

import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import { territoryStorage } from "./territory-storage";
import { cloudStorage } from './fileStorage';
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { dropMapSettings, territoryTemplates, tournaments, territories } from "../shared/schema";

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

// Аутентификация
const authenticateUser = async (req: any): Promise<{ userId: string, user: any } | { error: string, status: number }> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: "Требуется аутентификация", status: 401 };
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp && decoded.exp < Date.now()) {
      return { error: "Токен истек", status: 401 };
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
  
  // ===== DROPMAP ROUTES =====
  
  app.get("/api/dropmaps", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const settingsData = await db
        .select({
          settings: dropMapSettings,
          template: territoryTemplates,
          tournamentName: tournaments.name,
        })
        .from(dropMapSettings)
        .leftJoin(territoryTemplates, eq(dropMapSettings.templateId, territoryTemplates.id))
        .leftJoin(tournaments, eq(dropMapSettings.tournamentId, tournaments.id))
        .orderBy(desc(dropMapSettings.createdAt));
      
      const dropmaps = settingsData.map(row => ({
        ...row.settings,
        template: row.template ? {
          name: row.template.name,
          mapImageUrl: row.template.mapImageUrl,
        } : null,
        tournament: {
          name: row.tournamentName,
        },
      }));
      
      res.json(dropmaps);
    } catch (error) {
      console.error('Error fetching all dropmaps:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  app.post("/api/dropmap/settings", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    // Очищаем tournamentId если это "none" или пустая строка
    const tournamentId = req.body.tournamentId && 
                         req.body.tournamentId !== 'none' && 
                         req.body.tournamentId.trim() !== '' 
                         ? req.body.tournamentId 
                         : undefined;
    
    const settings = await territoryStorage.createDropMapSettings({
      templateId: req.body.templateId,
      tournamentId,
      mode: req.body.mode || 'tournament',
      maxPlayersPerSpot: req.body.maxPlayersPerSpot,
      maxContestedSpots: req.body.maxContestedSpots,
      allowReclaim: req.body.allowReclaim,
      createdBy: authResult.adminId,
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error creating dropmap settings:', error);
    res.status(500).json({ error: "Не удалось создать настройки" });
  }
});
  
  app.get("/api/dropmap/settings/template/:templateId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const settings = await territoryStorage.getDropMapByTemplate(req.params.templateId);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching dropmap settings:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  app.put("/api/dropmap/settings/:id", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const settings = await territoryStorage.updateDropMapSettings(req.params.id, req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating dropmap settings:', error);
      res.status(500).json({ error: "Не удалось обновить настройки" });
    }
  });
  
  app.post("/api/dropmap/settings/:id/players", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { userIds } = req.body;
      const added = [];
      
      for (const userId of userIds) {
        const user = await storage.getUser(userId);
        if (!user) continue;
        
        const player = await territoryStorage.addDropMapPlayer(
          req.params.id,
          userId,
          user.displayName,
          authResult.adminId,
          'manual'
        );
        added.push(player);
      }
      
      res.json({ added: added.length, players: added });
    } catch (error) {
      console.error('Error adding players:', error);
      res.status(500).json({ error: "Не удалось добавить игроков" });
    }
  });
  
  app.post("/api/dropmap/settings/:id/import-players", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { tournamentId, positions, topN } = req.body;
      
      const added = await territoryStorage.importDropMapPlayersFromTournament(
        req.params.id,
        tournamentId,
        positions,
        topN,
        authResult.adminId
      );
      
      res.json({ added: added.length, players: added });
    } catch (error) {
      console.error('Error importing players:', error);
      res.status(500).json({ error: "Не удалось импортировать игроков" });
    }
  });
  
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
  
  // Public route для проверки invite кода
  app.get("/api/dropmap/invite/:code", async (req, res) => {
    try {
      const validation = await territoryStorage.validateDropMapInvite(req.params.code);
      
      if (!validation.valid || !validation.invite) {
        return res.status(400).json({ error: validation.error });
      }
      
      const invite = validation.invite;
      const settings = await territoryStorage.getDropMapSettings(invite.settingsId);
      
      if (!settings) {
        return res.status(404).json({ error: "Настройки не найдены" });
      }
      
      const template = await territoryStorage.getTemplateWithShapes(settings.templateId);
      
      res.json({
        valid: true,
        displayName: invite.displayName,
        template: {
          id: template.id,
          name: template.name,
          mapImageUrl: template.mapImageUrl,
        },
        settingsId: settings.id,
      });
    } catch (error) {
      console.error('Error validating invite:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // Клейм с invite кодом
  app.post("/api/dropmap/claim-with-invite", async (req, res) => {
    try {
      const { code, territoryId } = req.body;
      
      const result = await territoryStorage.claimTerritoryWithInvite(code, territoryId);
      
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
  
  // ========== ШАБЛОНЫ КОНТУРОВ (SHAPES) ==========
  
  app.get("/api/territory/shapes", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const shapes = await territoryStorage.getAllShapes();
      res.json(shapes);
    } catch (error) {
      console.error('Ошибка получения контуров:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  app.post("/api/territory/shapes", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const shape = await territoryStorage.createShape({
        ...req.body,
        createdBy: authResult.adminId
      });
      
      res.json(shape);
    } catch (error) {
      console.error('Ошибка создания контура:', error);
      res.status(500).json({ error: "Не удалось создать контур" });
    }
  });
  
  // ========== ШАБЛОНЫ КАРТ (TEMPLATES) ==========
  
  app.get("/api/territory/templates", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const templates = await territoryStorage.getAllTemplatesWithDetails();
      res.json(templates);
    } catch (error) {
      console.error('Ошибка получения шаблонов:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  app.post("/api/territory/templates", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      let mapImageUrl: string | undefined;
      if (req.file) {
        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(req.file.buffer, filename, 'image');
        mapImageUrl = result.secure_url;
      }
      
      const shapeIds = JSON.parse(req.body.shapeIds || '[]');
      
      const template = await territoryStorage.createTemplate({
        name: req.body.name,
        description: req.body.description,
        mapImageUrl,
        shapeIds,
        tournamentId: req.body.tournamentId,
        createdBy: authResult.adminId
      });
      
      res.json(template);
    } catch (error) {
      console.error('Ошибка создания шаблона:', error);
      res.status(500).json({ error: "Не удалось создать шаблон" });
    }
  });
  
  app.post("/api/territory/templates/:id/activate", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      await territoryStorage.setActiveTemplate(req.params.id);
      res.json({ message: "Шаблон активирован" });
    } catch (error) {
      console.error('Ошибка активации шаблона:', error);
      res.status(500).json({ error: "Не удалось активировать шаблон" });
    }
  });
  
  // ========== ТЕРРИТОРИИ ==========
  
  app.get("/api/territory/territories", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      let templateId = req.query.templateId as string;
      
      if (!templateId) {
        const activeTemplate = await territoryStorage.getActiveTemplate();
        if (!activeTemplate) {
          return res.status(404).json({ error: "Нет активного шаблона" });
        }
        templateId = activeTemplate.id;
      }
      
      const territories = await territoryStorage.getTerritoriesForTemplate(
        templateId,
        authResult.userId
      );
      
      res.json(territories);
    } catch (error) {
      console.error('Ошибка получения территорий:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // ========== КЛЕЙМЫ ==========
  
  app.post("/api/territory/claim", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { territoryId } = req.body;
      
      const territory = await territoryStorage.getTerritory(territoryId);
      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }
      
      if (!territory.isActive) {
        return res.status(400).json({ error: "Территория неактивна" });
      }
      
      if (territory.ownerId === authResult.userId) {
        return res.status(400).json({ error: "Вы уже заклеймили эту территорию" });
      }
      
      const claim = await territoryStorage.claimTerritory(territoryId, authResult.userId);
      
      res.json({ 
        message: "Территория успешно заклеймлена",
        claim,
        immediate: true
      });
    } catch (error) {
      console.error('Ошибка клейма территории:', error);
      res.status(500).json({ error: "Не удалось заклеймить территорию" });
    }
  });
  
  // ========== ЛОГИ АКТИВНОСТИ ==========
  
  app.get("/api/territory/admin/logs", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await territoryStorage.getAdminActivityLogs(limit);
      
      res.json(logs);
    } catch (error) {
      console.error('Ошибка получения логов:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  // В territory-routes.ts добавьте этот endpoint:

// In territory-routes.ts - Replace the /add-shape endpoint with this:

app.post("/api/territory/templates/:id/add-shape", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    const { shapeId } = req.body;
    const templateId = req.params.id;
    
    // Get current template
    const [template] = await db
      .select()
      .from(territoryTemplates)
      .where(eq(territoryTemplates.id, templateId));
    
    if (!template) {
      return res.status(404).json({ error: "Шаблон не найден" });
    }
    
    // Get shape WITH its points
    const shape = await territoryStorage.getShape(shapeId);
    if (!shape) {
      return res.status(404).json({ error: "Контур не найден" });
    }
    
    // Validate shape has points
    if (!shape.points || (Array.isArray(shape.points) && shape.points.length < 3)) {
      return res.status(400).json({ 
        error: "Контур должен иметь минимум 3 точки",
        details: `Shape ${shapeId} has ${shape.points ? 'invalid' : 'no'} points`
      });
    }
    
    // Add shape to template's shapeIds
    const currentShapeIds = (template.shapeIds as string[]) || [];
    if (!currentShapeIds.includes(shapeId)) {
      const updatedShapeIds = [...currentShapeIds, shapeId];
      
      await db
        .update(territoryTemplates)
        .set({ 
          shapeIds: updatedShapeIds as any,
          updatedAt: new Date() 
        })
        .where(eq(territoryTemplates.id, templateId));
    }
    
    // Create territory instance WITH points from shape
    const [territory] = await db
      .insert(territories)
      .values({
        templateId: templateId,
        shapeId: shapeId,
        name: shape.name,
        points: shape.points as any, // Copy points from shape
        color: '#000000', // Черный для незаклеймленных
        priority: 1,
      })
      .returning();
    
    res.json(territory);
  } catch (error) {
    console.error('Error adding shape to template:', error);
    res.status(500).json({ 
      error: "Не удалось добавить локацию",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Добавьте этот роут в territory-routes.ts

app.delete("/api/territory/territories/:id", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    const territoryId = req.params.id;
    
    // Проверяем существование территории
    const territory = await territoryStorage.getTerritory(territoryId);
    if (!territory) {
      return res.status(404).json({ error: "Территория не найдена" });
    }
    
    // Удаляем территорию
    await territoryStorage.deleteTerritory(territoryId);
    
    res.json({ message: "Локация успешно удалена" });
  } catch (error) {
    console.error('Error deleting territory:', error);
    res.status(500).json({ error: "Не удалось удалить локацию" });
  }
});
  
  // ========== СТАТИСТИКА ==========
  
  app.get("/api/territory/stats/user/:userId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      if (authResult.userId !== req.params.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const territories = await territoryStorage.getUserTerritories(req.params.userId);
      
      const stats = {
        currentTerritories: territories.length,
        queueEntries: 0,
        totalClaims: territories.length,
        territoriesRevoked: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
}