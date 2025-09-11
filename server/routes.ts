import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from 'crypto';
import { fileTypeFromFile } from "file-type";
import sharp from "sharp";
import { storage } from "./storage";
import { 
  insertSubmissionSchema, 
  reviewSubmissionSchema, 
  updateUserBalanceSchema,
  linkTelegramSchema 
} from "@shared/schema";

// File upload configuration using memory storage for security
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory until after authentication
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Basic MIME type check (still need magic bytes validation later)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/user/:id/telegram", async (req, res) => {
    try {
      const validation = linkTelegramSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid telegram username", details: validation.error });
      }

      const user = await storage.updateUser(req.params.id, {
        telegramUsername: validation.data.telegramUsername
      });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper function to clean up files
  const cleanupFiles = async (filePath: string | null, previewPath: string | null) => {
    if (filePath) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    
    if (previewPath) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(previewPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup preview file:', cleanupError);
      }
    }
  };

  // Authentication middleware function
  const authenticateUser = async (req: any): Promise<{ userId: string, user: any } | { error: string, status: number }> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: "Authentication required. Please provide Bearer token.", status: 401 };
    }
    
    const userId = authHeader.substring(7);
    if (!userId) {
      return { error: "Invalid authentication token", status: 401 };
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return { error: "User not found", status: 404 };
    }
    
    return { userId, user };
  };

  // File upload route with memory storage (secure)
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    let uploadedFilePath: string | null = null;
    let previewPath: string | null = null;
    let success = false;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Authenticate user BEFORE any disk operations
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { userId, user } = authResult;

      // Advanced file type validation using magic bytes on buffer
      const { fileTypeFromBuffer } = await import('file-type');
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (!fileType) {
        return res.status(400).json({ error: "Unable to determine file type" });
      }

      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

      if (!allAllowedTypes.includes(fileType.mime)) {
        return res.status(400).json({ error: "Invalid file type detected. Only images and videos are allowed." });
      }

      const detectedFileType = allowedImageTypes.includes(fileType.mime) ? 'image' : 'video';
      
      // Generate unique filename and write to disk ONLY after validation
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const filename = `file-${uniqueSuffix}${ext}`;
      uploadedFilePath = path.join('./uploads', filename);
      
      // Write file to disk
      const fs = require('fs').promises;
      await fs.writeFile(uploadedFilePath, req.file.buffer);
      
      // Generate preview/thumbnail after file is written
      try {
        if (detectedFileType === 'image') {
          const previewFilename = `preview-${filename}.webp`;
          previewPath = path.join('./uploads', previewFilename);
          
          await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(previewPath);
        }
      } catch (previewError) {
        console.warn('Preview generation failed:', previewError);
        // Continue without preview - not critical
      }
      
      // Validate submission data
      const submissionData = {
        userId: userId,
        filename: filename,
        originalFilename: req.file.originalname,
        fileType: detectedFileType,
        fileSize: req.file.size,
        filePath: uploadedFilePath,
        category: req.body.category
      };

      const validation = insertSubmissionSchema.safeParse(submissionData);
      if (!validation.success) {
        await cleanupFiles(uploadedFilePath, previewPath);
        return res.status(400).json({ error: "Invalid submission data", details: validation.error });
      }

      const submission = await storage.createSubmission(validation.data);
      
      // Mark success to prevent cleanup
      success = true;
      
      // Add preview URL to response if available
      const response = {
        ...submission,
        previewUrl: previewPath ? `/api/preview/${submission.id}` : null
      };
      
      res.json(response);
    } catch (error) {
      console.error('Upload error:', error);
      await cleanupFiles(uploadedFilePath, previewPath);
      res.status(500).json({ error: "Failed to process upload" });
    } finally {
      // Cleanup on any non-success path
      if (!success) {
        await cleanupFiles(uploadedFilePath, previewPath);
      }
    }
  });

  // Submission routes
  app.get("/api/submissions", async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/submissions/user/:userId", async (req, res) => {
    try {
      const submissions = await storage.getSubmissionsByUserId(req.params.userId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/submission/:id", async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin routes
  app.post("/api/admin/submission/:id/review", async (req, res) => {
    try {
      const validation = reviewSubmissionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid review data", details: validation.error });
      }

      const { status, reward, rejectionReason } = validation.data;
      
      // Authenticate admin user
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authentication required. Please provide Bearer token." });
      }
      
      const reviewerId = authHeader.substring(7);
      if (!reviewerId) {
        return res.status(401).json({ error: "Invalid authentication token" });
      }

      // Verify reviewer is admin
      const reviewer = await storage.getUser(reviewerId);
      if (!reviewer || !reviewer.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Validate business rules
      if (status === 'approved' && !reward) {
        return res.status(400).json({ error: "Reward amount required for approved submissions" });
      }
      
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason required for rejected submissions" });
      }

      const submission = await storage.updateSubmissionStatus(
        req.params.id, 
        status, 
        reviewerId, 
        reward, 
        rejectionReason
      );

      // If approved, update user balance
      if (status === 'approved' && reward) {
        await storage.updateUserBalance(submission.userId, reward);
        
        // Log admin action
        await storage.createAdminAction({
          adminId: reviewerId,
          action: 'approve_submission',
          targetType: 'submission',
          targetId: submission.id,
          details: JSON.stringify({ reward, submissionId: submission.id })
        });
      } else if (status === 'rejected') {
        // Log admin action
        await storage.createAdminAction({
          adminId: reviewerId,
          action: 'reject_submission',
          targetType: 'submission',
          targetId: submission.id,
          details: JSON.stringify({ rejectionReason, submissionId: submission.id })
        });
      }

      res.json(submission);
    } catch (error) {
      console.error('Review error:', error);
      res.status(500).json({ error: "Failed to process review" });
    }
  });

  app.post("/api/admin/user/:id/balance", async (req, res) => {
    try {
      const validation = updateUserBalanceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid balance update data", details: validation.error });
      }

      const { amount, reason } = validation.data;
      
      // Authenticate admin user
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authentication required. Please provide Bearer token." });
      }
      
      const adminId = authHeader.substring(7);
      if (!adminId) {
        return res.status(401).json({ error: "Invalid authentication token" });
      }

      // Verify admin access
      const admin = await storage.getUser(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const user = await storage.updateUserBalance(req.params.id, amount);
      
      // Log admin action
      await storage.createAdminAction({
        adminId: adminId,
        action: 'adjust_balance',
        targetType: 'user',
        targetId: user.id,
        details: JSON.stringify({ amount, reason, newBalance: user.balance })
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update balance" });
    }
  });

  app.get("/api/admin/actions", async (req, res) => {
    try {
      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve uploaded files securely by submission ID
  app.get("/api/files/:submissionId", async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Validate that the file path is safe and within uploads directory
      const filePath = path.resolve(submission.filePath);
      const uploadsDir = path.resolve('./uploads');
      
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve preview thumbnails securely
  app.get("/api/preview/:submissionId", async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Preview not found" });
      }
      
      // Generate preview filename
      const previewFilename = `preview-${submission.filename}.webp`;
      const previewPath = path.resolve('./uploads', previewFilename);
      const uploadsDir = path.resolve('./uploads');
      
      if (!previewPath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.sendFile(previewPath);
    } catch (error) {
      res.status(404).json({ error: "Preview not available" });
    }
  });

  // Добавь эти роуты после существующих в функции registerRoutes

  // Epic Games OAuth Routes
  app.get("/api/auth/epic/login", async (req, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(32).toString('hex');
      
      // В продакшене сохрани state в session или Redis для проверки
      // Сейчас для простоты пропускаем
      
      const params = new URLSearchParams({
        client_id: process.env.EPIC_CLIENT_ID || '',
        redirect_uri: process.env.EPIC_REDIRECT_URI || '',
        response_type: 'code',
        scope: 'basic_profile',
        state: state,
        nonce: nonce
      });
      
      const authUrl = `https://www.epicgames.com/id/authorize?${params}`;
      res.json({ authUrl, state });
    } catch (error) {
      console.error('Epic login error:', error);
      res.status(500).json({ error: "Failed to initialize Epic Games login" });
    }
  });

  app.get("/api/auth/epic/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }
      
      // Обмен code на токен
      const tokenResponse = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: process.env.EPIC_REDIRECT_URI || ''
        })
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      // Получение профиля пользователя
      const profileResponse = await fetch('https://api.epicgames.dev/epic/oauth/v2/userInfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (!profileResponse.ok) {
        throw new Error(`Profile fetch failed: ${profileResponse.statusText}`);
      }
      
      const profile = await profileResponse.json();
      
      // Проверка существует ли пользователь
      let user = await storage.getUserByEpicGamesId(profile.sub);
      
      if (!user) {
        // Создание нового пользователя
        user = await storage.createUser({
          id: crypto.randomUUID(),
          username: profile.preferred_username || `epic_${profile.sub.slice(0, 8)}`,
          epicGamesId: profile.sub,
          displayName: profile.name || profile.preferred_username,
          email: profile.email,
          balance: 0,
          isAdmin: false
        });
      }
      
      // Генерация простого JWT токена (в продакшене используй библиотеку типа jsonwebtoken)
      const userToken = Buffer.from(JSON.stringify({
        userId: user.id,
        epicGamesId: user.epicGamesId,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
      })).toString('base64');
      
      // Редирект на фронтенд с токеном
      res.redirect(`/?token=${userToken}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: user.balance
      }))}`);
      
    } catch (error) {
      console.error('Epic callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  // Проверка текущего пользователя
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const token = authHeader.substring(7);
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Проверка срока действия токена
      if (decoded.exp < Date.now()) {
        return res.status(401).json({ error: "Token expired" });
      }
      
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: user.balance,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Логаут
  app.post("/api/auth/logout", async (req, res) => {
    // Для простых токенов просто возвращаем успех
    // В продакшене нужно добавить токен в blacklist
    res.json({ message: "Logged out successfully" });
  });


  const httpServer = createServer(app);

  return httpServer;
  
}


