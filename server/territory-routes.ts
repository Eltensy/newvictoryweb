// server/territory-routes.ts - ПОЛНЫЕ ОПТИМИЗИРОВАННЫЕ МАРШРУТЫ

import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import { territoryStorage } from "./territory-storage";
import { cloudStorage } from './fileStorage';
import { storage } from "./storage";

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
  return { adminId: authResult.user.id, admin: authResult.user };
};

export function registerTerritoryRoutes(app: Express) {
  
  // ========== ШАБЛОНЫ КОНТУРОВ (SHAPES) ==========
  
  // Получить все контуры
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
  
  // Получить один контур
  app.get("/api/territory/shapes/:id", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const shape = await territoryStorage.getShape(req.params.id);
      if (!shape) {
        return res.status(404).json({ error: "Контур не найден" });
      }
      
      res.json(shape);
    } catch (error) {
      console.error('Ошибка получения контура:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // Создать контур (админ)
  app.post("/api/territory/shapes", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const schema = z.object({
        name: z.string().min(1).max(100),
        points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
        defaultColor: z.string().regex(/^#[0-9A-F]{6}$/i),
        description: z.string().optional(),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Неверные данные", 
          details: validation.error.errors 
        });
      }
      
      const shape = await territoryStorage.createShape({
        ...validation.data,
        createdBy: authResult.adminId
      });
      
      res.json(shape);
    } catch (error) {
      console.error('Ошибка создания контура:', error);
      res.status(500).json({ error: "Не удалось создать контур" });
    }
  });
  
  // Обновить контур (админ)
  app.put("/api/territory/shapes/:id", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const shape = await territoryStorage.updateShape(req.params.id, req.body);
      if (!shape) {
        return res.status(404).json({ error: "Контур не найден" });
      }
      
      res.json(shape);
    } catch (error) {
      console.error('Ошибка обновления контура:', error);
      res.status(500).json({ error: "Не удалось обновить контур" });
    }
  });
  
  // Удалить контур (админ)
  app.delete("/api/territory/shapes/:id", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      await territoryStorage.deleteShape(req.params.id);
      res.json({ message: "Контур удален" });
    } catch (error) {
      console.error('Ошибка удаления контура:', error);
      res.status(500).json({ error: "Не удалось удалить контур" });
    }
  });
  
  // ========== ШАБЛОНЫ КАРТ (TEMPLATES) ==========
  
  // Получить все шаблоны
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
  
  // Получить один шаблон с контурами
  app.get("/api/territory/templates/:id", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const template = await territoryStorage.getTemplateWithShapes(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Шаблон не найден" });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Ошибка получения шаблона:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // Создать шаблон (админ)
  app.post("/api/territory/templates", upload.single('mapImage'), async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        shapeIds: z.string().transform(str => {
          try {
            return JSON.parse(str);
          } catch {
            return [];
          }
        }).pipe(z.array(z.string().uuid())),
        tournamentId: z.string().uuid().optional(),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Неверные данные", 
          details: validation.error.errors 
        });
      }
      
      if (validation.data.shapeIds.length === 0) {
        return res.status(400).json({ error: "Выберите хотя бы один контур" });
      }
      
      let mapImageUrl: string | undefined;
      if (req.file) {
        const filename = `map-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const result = await cloudStorage.uploadFile(req.file.buffer, filename, 'image');
        mapImageUrl = result.secure_url;
      }
      
      const template = await territoryStorage.createTemplate({
        ...validation.data,
        mapImageUrl,
        createdBy: authResult.adminId
      });
      
      res.json(template);
    } catch (error) {
      console.error('Ошибка создания шаблона:', error);
      res.status(500).json({ error: "Не удалось создать шаблон" });
    }
  });
  
  // Активировать шаблон (админ)
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
  
  // Удалить шаблон (админ)
  app.delete("/api/territory/templates/:id", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      await territoryStorage.deleteTemplate(req.params.id);
      res.json({ message: "Шаблон удален" });
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error);
      res.status(500).json({ error: "Не удалось удалить шаблон" });
    }
  });
  
  // ========== ТЕРРИТОРИИ ==========
  
  // Получить территории для шаблона
  app.get("/api/territory/territories", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      let templateId = req.query.templateId as string;
      
      // Если не указан шаблон, берем активный
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
  
  // Получить территории пользователя
  app.get("/api/territory/my-territories", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const territories = await territoryStorage.getUserTerritories(authResult.userId);
      res.json(territories);
    } catch (error) {
      console.error('Ошибка получения территорий пользователя:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // ========== КЛЕЙМЫ ==========
  
  // Заклеймить территорию
  app.post("/api/territory/claim", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const schema = z.object({
        territoryId: z.string().uuid(),
        replaceExisting: z.boolean().optional().default(true),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Неверные данные", 
          details: validation.error.errors 
        });
      }
      
      // Проверяем существование территории
      const territory = await territoryStorage.getTerritory(validation.data.territoryId);
      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }
      
      if (!territory.isActive) {
        return res.status(400).json({ error: "Территория неактивна" });
      }
      
      // Проверяем, не заклеймлена ли уже пользователем
      if (territory.ownerId === authResult.userId) {
        return res.status(400).json({ error: "Вы уже заклеймили эту территорию" });
      }
      
      const claim = await territoryStorage.claimTerritory(
        validation.data.territoryId,
        authResult.userId
      );
      
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
  
  // Отозвать территорию (админ)
  app.post("/api/territory/admin/revoke/:territoryId", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const schema = z.object({
        reason: z.string().min(1, "Причина обязательна")
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Неверные данные", 
          details: validation.error.errors 
        });
      }
      
      const territory = await territoryStorage.getTerritory(req.params.territoryId);
      if (!territory) {
        return res.status(404).json({ error: "Территория не найдена" });
      }
      
      if (!territory.ownerId) {
        return res.status(400).json({ error: "Территория не заклеймлена" });
      }
      
      await territoryStorage.revokeTerritory(
        req.params.territoryId,
        authResult.adminId,
        validation.data.reason
      );
      
      res.json({ message: "Территория успешно отозвана" });
    } catch (error) {
      console.error('Ошибка отзыва территории:', error);
      res.status(500).json({ error: "Не удалось отозвать территорию" });
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
  
  // ========== СТАТИСТИКА ==========
  
  app.get("/api/territory/stats/user/:userId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      // Пользователи видят только свою статистику
      if (authResult.userId !== req.params.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const territories = await territoryStorage.getUserTerritories(req.params.userId);
      
      const stats = {
        currentTerritories: territories.length,
        queueEntries: 0, // Можно добавить если нужно
        totalClaims: territories.length, // Упрощенная версия
        territoriesRevoked: 0 // Можно добавить подсчет
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
  
  // ========== ОБЩАЯ СТАТИСТИКА ==========
  
  app.get("/api/territory/stats", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      // Здесь можно добавить общую статистику по всей системе
      const stats = {
        totalTemplates: 0,
        totalShapes: 0,
        totalTerritories: 0,
        claimedTerritories: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Ошибка получения общей статистики:', error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });
}