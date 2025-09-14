// Make sure your imports at the top of routes.ts look like this:
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from 'crypto';
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { storage } from "./storage";
import { promises as fs } from 'fs';
import { cloudStorage } from './fileStorage.js';
import dotenv from "dotenv";
dotenv.config();
import { 
  insertSubmissionSchema, 
  reviewSubmissionSchema, 
  updateUserBalanceSchema,
  linkTelegramSchema,
  insertUserSchema,
  processWithdrawalSchema,
  createWithdrawalRequestSchema,
  type InsertUser
} from "@shared/schema";


// File upload configuration using memory storage for security
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.'));
    }
  }
});

// Authentication middleware
const authenticateUser = async (req: any): Promise<{ userId: string, user: any } | { error: string, status: number }> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: "Authentication required. Please provide Bearer token.", status: 401 };
  }
  
  const token = authHeader.substring(7);
  if (!token) {
    return { error: "Invalid authentication token", status: 401 };
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now()) {
      return { error: "Token expired", status: 401 };
    }

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return { error: "User not found", status: 404 };
    }
    
    return { userId: decoded.userId, user };
  } catch (error) {
    return { error: "Invalid token format", status: 401 };
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req: any): Promise<{ adminId: string, admin: any } | { error: string, status: number }> => {
  const authResult = await authenticateUser(req);
  if ('error' in authResult) {
    return authResult;
  }

  const { user } = authResult;
  if (!user.isAdmin) {
    return { error: "Admin access required", status: 403 };
  }

  return { adminId: user.id, admin: user };
};

// File cleanup helper
const cleanupFiles = async (filePath: string | null, previewPath: string | null) => {
  if (filePath) {
    try {
      // Проверяем существование файла перед удалением
      await fs.access(filePath);
      await fs.unlink(filePath);
      console.log('Successfully cleaned up uploaded file:', filePath);
    } catch (cleanupError: any) {
      // Игнорируем ошибку если файл не существует
      if (cleanupError.code !== 'ENOENT') {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
  }
  
  if (previewPath) {
    try {
      // Проверяем существование файла перед удалением
      await fs.access(previewPath);
      await fs.unlink(previewPath);
      console.log('Successfully cleaned up preview file:', previewPath);
    } catch (cleanupError: any) {
      // Игнорируем ошибку если файл не существует
      if (cleanupError.code !== 'ENOENT') {
        console.error('Failed to cleanup preview file:', cleanupError);
      }
    }
  }
};


export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== AUTHENTICATION ROUTES =====
  if (process.env.NODE_ENV === 'development') {
  // В режиме разработки также обслуживаем файлы напрямую для тестирования
  
  // Логирование запросов к uploads
  app.use('/uploads/*', (req, res, next) => {
    console.log(`📂 Direct uploads request: ${req.path}`);
    next();
  });
}

// Добавьте эти routes в routes.ts в разделе ADMIN ROUTES:

// Debug route для проверки файлов
app.get("/api/debug/files", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const uploadsPath = path.resolve('./uploads');
    console.log('📂 Checking uploads directory:', uploadsPath);
    
    try {
      // Ensure directory exists
      await fs.mkdir(uploadsPath, { recursive: true });
      
      const files = await fs.readdir(uploadsPath);
      const fileDetails = await Promise.all(files.slice(0, 50).map(async (file) => {
        const filePath = path.join(uploadsPath, file);
        try {
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            isFile: stats.isFile(),
            path: filePath
          };
        } catch (statError) {
          return {
            name: file,
            error: 'Could not read file stats',
            path: filePath
          };
        }
      }));
      
      res.json({
        uploadsPath,
        totalFiles: files.length,
        files: fileDetails
      });
    } catch (readError: any) {
      console.error('❌ Could not read uploads directory:', readError);
      res.json({
        uploadsPath,
        error: `Could not read directory: ${readError.message}`,
        totalFiles: 0,
        files: []
      });
    }
  } catch (error) {
    console.error('Debug files error:', error);
    res.status(500).json({ error: 'Failed to read uploads directory' });
  }
});

// Debug route для конкретной заявки
app.get("/api/debug/submission/:id", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const submission = await storage.getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Check if file exists
    let fileExists = false;
    let fileStats = null;
    let alternativeFiles = [];

    try {
      const stats = await fs.stat(submission.filePath);
      fileExists = true;
      fileStats = {
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    } catch (error) {
      console.log('File not found at stored path, checking alternatives...');
      
      // Try to find alternative files
      const uploadsDir = path.resolve('./uploads');
      try {
        const files = await fs.readdir(uploadsDir);
        alternativeFiles = files.filter(file => 
          file.includes(submission.filename) || 
          file.includes(submission.originalFilename) ||
          file.includes(submission.id)
        );
      } catch (readError) {
        console.error('Could not read uploads directory:', readError);
      }
    }

    res.json({
      submission: {
        id: submission.id,
        filename: submission.filename,
        originalFilename: submission.originalFilename,
        filePath: submission.filePath,
        fileType: submission.fileType,
        fileSize: submission.fileSize,
        status: submission.status,
        createdAt: submission.createdAt
      },
      fileExists,
      fileStats,
      alternativeFiles,
      uploadsDirectory: path.resolve('./uploads')
    });
  } catch (error) {
    console.error('Debug submission error:', error);
    res.status(500).json({ error: 'Failed to debug submission' });
  }
});
  // Epic Games OAuth - Initialize login
  app.get("/api/auth/epic/login", async (req, res) => {
    try {
      if (!process.env.EPIC_CLIENT_ID || !process.env.EPIC_REDIRECT_URI) {
        return res.status(500).json({ 
          error: "Epic Games authentication is not configured. Please contact support." 
        });
      }

      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(32).toString('hex');
      
      const params = new URLSearchParams({
        client_id: process.env.EPIC_CLIENT_ID,
        redirect_uri: process.env.EPIC_REDIRECT_URI,
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
  
  // Epic Games OAuth - Handle callback
  app.get("/api/auth/epic/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('Epic OAuth error:', error);
        return res.redirect(`/?error=epic_oauth_error&message=${encodeURIComponent(error as string)}`);
      }
      
      if (!code) {
        return res.redirect('/?error=missing_authorization_code');
      }
      
      // Exchange code for token
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.EPIC_REDIRECT_URI || ''
      });

      const credentials = Buffer.from(
        `${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`
      ).toString('base64');
      
      const tokenResponse = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: tokenParams
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return res.redirect('/?error=token_exchange_failed');
      }
      
      const tokenData = await tokenResponse.json();
      
      // Get user profile
      const profileResponse = await fetch('https://api.epicgames.dev/epic/oauth/v2/userInfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Profile fetch failed:', errorText);
        return res.redirect('/?error=profile_fetch_failed');
      }
      
      const profile = await profileResponse.json();
      
      // Check if user already exists
      let user = await storage.getUserByEpicGamesId(profile.sub);
      
      if (!user) {
        // Create new user
        const newUser: InsertUser = {
          username: profile.preferred_username || `epic_${profile.sub.slice(0, 8)}`,
          epicGamesId: profile.sub,
          displayName: profile.name || profile.preferred_username || 'Epic User',
          email: profile.email || null,
          balance: 0,
          isAdmin: false
        };
        
        user = await storage.createUser(newUser);
      }
      
      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenPayload = {
        userId: user.id,
        epicGamesId: user.epicGamesId,
        sessionToken,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };
      
      const userToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      
      // Redirect to frontend with success
      const redirectUrl = new URL('/', `${req.protocol}://${req.get('host')}`);
      redirectUrl.searchParams.set('auth', 'success');
      redirectUrl.searchParams.set('token', userToken);
      redirectUrl.searchParams.set('user', JSON.stringify({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: user.balance,
        isAdmin: user.isAdmin
      }));
      
      res.redirect(redirectUrl.toString());
      
    } catch (error) {
      console.error('Epic callback error:', error);
      res.redirect('/?error=authentication_failed');
    }
  });

  // Verify current authentication
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { user } = authResult;
      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        balance: user.balance,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: "Authentication verification failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    // For token-based auth, just return success
    // In production, you might want to blacklist the token
    res.json({ message: "Logged out successfully" });
  });

  // ===== USER ROUTES =====
  app.get("/api/user/epic/:epicId", async (req, res) => {
  try {
    const user = await storage.getUserByEpicGamesId(req.params.epicId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { epicGamesId, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

  // Get user by ID
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't expose sensitive information
      const { epicGamesId, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user statistics
  app.get("/api/user/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/user/:id/telegram", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });

    if (authResult.userId !== req.params.id) return res.status(403).json({ error: "Access denied" });

    const user = await storage.getUser(req.params.id);
    res.json({ telegramUsername: user.telegramUsername || null });
  } catch (error) {
    console.error('Check Telegram error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.delete("/api/user/:id/telegram", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });

    if (authResult.userId !== req.params.id) return res.status(403).json({ error: "Access denied" });

    const user = await storage.updateUser(req.params.id, { telegramUsername: null });
    res.json({ message: "Telegram unlinked successfully", telegramUsername: user.telegramUsername });
  } catch (error) {
    console.error('Unlink Telegram error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});
  // Link Telegram account
  app.post("/api/user/:id/telegram", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Verify user is updating their own account
      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const validation = linkTelegramSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid telegram username", 
          details: validation.error.errors 
        });
      }

      const user = await storage.updateUser(req.params.id, {
        telegramUsername: validation.data.telegramUsername
      });
      
      res.json({ 
        message: "Telegram account linked successfully",
        telegramUsername: user.telegramUsername
      });
    } catch (error) {
      console.error('Link telegram error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== FILE UPLOAD ROUTES =====

  // Upload file and create submission
 // Замените upload route в routes.ts на этот исправленный вариант:

app.post("/api/upload", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Authenticate user BEFORE any operations
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    const { userId, user } = authResult;

    // Advanced file type validation using magic bytes
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
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname) || `.${fileType.ext}`;
    const filename = `${userId}-${uniqueSuffix}${ext}`;
    
    console.log(`☁️ Uploading to Cloudinary: ${filename}`);
    
    // Upload to Cloudinary
    const cloudinaryResult = await cloudStorage.uploadFile(
      req.file.buffer,
      filename,
      detectedFileType
    );
    
    console.log(`✅ Cloudinary upload successful:`, {
      public_id: cloudinaryResult.public_id,
      url: cloudinaryResult.secure_url,
      size: cloudinaryResult.bytes
    });
    
    // Validate submission data - сохраняем Cloudinary URLs
    const submissionData = {
      userId: userId,
      filename: cloudinaryResult.public_id, // Сохраняем public_id для управления
      originalFilename: req.file.originalname,
      fileType: detectedFileType,
      fileSize: req.file.size,
      filePath: cloudinaryResult.secure_url, // Сохраняем URL файла
      category: req.body.category,
      // Дополнительные поля для Cloudinary
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url
    };

    console.log(`📝 Creating submission with Cloudinary data:`, submissionData);

    const validation = insertSubmissionSchema.safeParse(submissionData);
    if (!validation.success) {
      // Если валидация не прошла, удаляем файл из Cloudinary
      await cloudStorage.deleteFile(cloudinaryResult.public_id);
      throw new Error(`Invalid submission data: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }

    const submission = await storage.createSubmission(validation.data);
    console.log('✅ Submission created successfully:', {
      id: submission.id,
      cloudinaryPublicId: submission.cloudinaryPublicId,
      url: submission.filePath
    });
    
    // Generate thumbnail URL for preview
    const thumbnailUrl = cloudStorage.generateThumbnail(cloudinaryResult.public_id);
    
    // Success response
    res.json({
      ...submission,
      thumbnailUrl,
      fileUrl: cloudinaryResult.secure_url
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process upload";
    res.status(500).json({ error: errorMessage });
  }
});
  // ===== SUBMISSION ROUTES =====

  // Get all submissions (admin only)
  app.get("/api/submissions", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const submissions = await storage.getAllSubmissionsWithUsers();
      res.json(submissions);
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get submissions by user ID
  app.get("/api/submissions/user/:userId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Users can only see their own submissions, admins can see any
      if (authResult.userId !== req.params.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const submissions = await storage.getSubmissionsByUserId(req.params.userId);
      res.json(submissions);
    } catch (error) {
      console.error('Get user submissions error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get single submission
  app.get("/api/submission/:id", async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Users can only see their own submissions, admins can see any
      if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(submission);
    } catch (error) {
      console.error('Get submission error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== ADMIN ROUTES =====

  // Review submission (approve/reject)
  app.post("/api/admin/submission/:id/review", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    console.log('Review request body:', req.body); // Для отладки

    // Преобразуем данные перед валидацией
    const reviewData = {
      status: req.body.status,
      reward: req.body.reward ? Number(req.body.reward) : undefined, // Преобразуем в число
      rejectionReason: req.body.rejectionReason
    };

    console.log('Transformed review data:', reviewData); // Для отладки

    const validation = reviewSubmissionSchema.safeParse(reviewData);
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors); // Для отладки
      return res.status(400).json({ 
        error: "Invalid review data", 
        details: validation.error.errors 
      });
    }

    const { status, reward, rejectionReason } = validation.data;
    
    // Validate business rules
    if (status === 'approved' && (!reward || reward <= 0)) {
      return res.status(400).json({ error: "Valid reward amount required for approved submissions" });
    }
    
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: "Rejection reason required for rejected submissions" });
    }

    const submission = await storage.updateSubmissionStatus(
      req.params.id, 
      status, 
      authResult.adminId, 
      reward, 
      rejectionReason
    );

    // If approved, update user balance
    if (status === 'approved' && reward) {
      await storage.updateUserBalance(submission.userId, reward);
      
      // Log admin action
      await storage.createAdminAction({
        adminId: authResult.adminId,
        action: 'approve_submission',
        targetType: 'submission',
        targetId: submission.id,
        details: JSON.stringify({ reward, submissionId: submission.id })
      });
    } else if (status === 'rejected') {
      // Log admin action
      await storage.createAdminAction({
        adminId: authResult.adminId,
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
app.get("/api/admin/users", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const users = await storage.getAllUsers();
    
    // Добавляем статистику для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          const stats = await storage.getUserStats(user.id);
          return {
            ...user,
            stats
          };
        } catch (error) {
          console.error(`Failed to get stats for user ${user.id}:`, error);
          return {
            ...user,
            stats: {
              totalSubmissions: 0,
              approvedSubmissions: 0,
              pendingSubmissions: 0,
              rejectedSubmissions: 0,
              totalEarnings: 0,
              isAdmin: user.isAdmin
            }
          };
        }
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});
  app.post("/api/admin/user/:id/balance", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    console.log('Balance update request body:', req.body); // Для отладки

    // Преобразуем данные перед валидацией
    const balanceData = {
      amount: req.body.amount ? Number(req.body.amount) : undefined, // Преобразуем в число
      reason: req.body.reason
    };

    console.log('Transformed balance data:', balanceData); // Для отладки

    const validation = updateUserBalanceSchema.safeParse(balanceData);
    if (!validation.success) {
      console.error('Balance validation failed:', validation.error.errors); // Для отладки
      return res.status(400).json({ 
        error: "Invalid balance update data", 
        details: validation.error.errors 
      });
    }

    const { amount, reason } = validation.data;
    
    // Дополнительная проверка
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const user = await storage.updateUserBalance(req.params.id, amount);
    
    // Log admin action
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'adjust_balance',
      targetType: 'user',
      targetId: user.id,
      details: JSON.stringify({ amount, reason, newBalance: user.balance })
    });

    res.json(user);
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: "Failed to update balance" });
  }
});
  // Get admin actions log
  app.get("/api/admin/actions", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error) {
      console.error('Get admin actions error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== FILE SERVING ROUTES =====

  // Serve uploaded files securely by submission ID
  // Замените маршрут /api/files/:submissionId в routes.ts на этот улучшенный вариант:

app.get("/api/files/:submissionId", async (req, res) => {
  const submissionId = req.params.submissionId;
  console.log(`📁 File request for submission: ${submissionId}`);
  
  try {
    // Get submission data
    const submission = await storage.getSubmission(submissionId);
    if (!submission) {
      console.error(`❌ Submission not found: ${submissionId}`);
      return res.status(404).json({ error: "File not found - submission not found" });
    }

    // Check authentication
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      console.error(`❌ Authentication failed for submission ${submissionId}:`, authResult.error);
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Check access permissions
    if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
      console.error(`❌ Access denied for user ${authResult.userId} to submission ${submissionId}`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Для Cloudinary файлов просто редиректим на URL
    if (submission.filePath.startsWith('https://res.cloudinary.com')) {
      console.log(`🔗 Redirecting to Cloudinary URL: ${submission.filePath}`);
      return res.redirect(submission.filePath);
    }

    // Fallback для старых файлов в файловой системе (если есть)
    const filePath = path.resolve(submission.filePath);
    const uploadsDir = path.resolve('./uploads');
    
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: "Access denied - invalid path" });
    }
    
    try {
      await fs.access(filePath, fs.constants.F_OK);
      res.sendFile(filePath);
    } catch (accessError: any) {
      return res.status(404).json({ error: "File not found on disk" });
    }
    
  } catch (error) {
    console.error(`❌ Serve file error for submission ${submissionId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve preview/thumbnail
app.get("/api/preview/:submissionId", async (req, res) => {
  try {
    const submission = await storage.getSubmission(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const authResult = await authenticateUser(req);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Для Cloudinary файлов генерируем thumbnail URL
    if (submission.cloudinaryPublicId) {
      const thumbnailUrl = cloudStorage.generateThumbnail(submission.cloudinaryPublicId);
      console.log(`🖼️ Redirecting to Cloudinary thumbnail: ${thumbnailUrl}`);
      return res.redirect(thumbnailUrl);
    }

    // Fallback для старых файлов
    const previewPath = submission.filePath.replace(/file-/, "preview-file-") + ".webp";
    try {
      await fs.access(previewPath);
      res.sendFile(path.resolve(previewPath));
    } catch {
      return res.status(404).json({ error: "Preview not found" });
    }
  } catch (error) {
    console.error("Serve preview error:", error);
    res.status(500).json({ error: "Failed to serve preview" });
  }
});

// Новый маршрут для получения прямого URL файла (для админки)
app.get("/api/file-url/:submissionId", async (req, res) => {
  try {
    const submission = await storage.getSubmission(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const authResult = await authenticateUser(req);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    
    if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      fileUrl: submission.filePath,
      thumbnailUrl: submission.cloudinaryPublicId 
        ? cloudStorage.generateThumbnail(submission.cloudinaryPublicId) 
        : null
    });
  } catch (error) {
    console.error("Get file URL error:", error);
    res.status(500).json({ error: "Failed to get file URL" });
  }
});
app.get("/api/user/:id/balance/transactions", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Пользователи могут видеть только свои транзакции, админы - любые
    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const transactions = await storage.getUserBalanceTransactions(req.params.id, limit);
    
    res.json(transactions);
  } catch (error) {
    console.error('Get balance transactions error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===== WITHDRAWAL ROUTES =====

// Создать заявку на вывод
app.post("/api/user/:id/withdrawal", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Пользователь может создать заявку только для себя
    if (authResult.userId !== req.params.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    console.log('Withdrawal request body:', req.body);

    const validation = createWithdrawalRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('Withdrawal validation failed:', validation.error.errors);
      return res.status(400).json({ 
        error: "Invalid withdrawal data", 
        details: validation.error.errors 
      });
    }

    const { amount, method, methodData } = validation.data;

    // Проверяем баланс пользователя
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Проверяем нет ли активных заявок на вывод
    const activeRequests = await storage.getUserWithdrawalRequests(req.params.id);
    const pendingRequests = activeRequests.filter(r => r.status === 'pending' || r.status === 'processing');
    
    if (pendingRequests.length > 0) {
      return res.status(400).json({ 
        error: "You already have a pending withdrawal request" 
      });
    }

    // Создаем заявку на вывод
    const withdrawalRequest = await storage.createWithdrawalRequest({
      userId: req.params.id,
      amount,
      method,
      methodData: JSON.stringify(methodData),
      status: 'pending'
    });

    // Резервируем средства (уменьшаем баланс)
    await storage.updateUserBalance(
      req.params.id, 
      -amount, 
      `Заявка на вывод #${withdrawalRequest.id}`,
      'withdrawal_request',
      'withdrawal',
      withdrawalRequest.id
    );

    res.json(withdrawalRequest);
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: "Failed to create withdrawal request" });
  }
});

// Получить заявки на вывод пользователя
app.get("/api/user/:id/withdrawals", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Пользователи могут видеть только свои заявки, админы - любые
    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const requests = await storage.getUserWithdrawalRequests(req.params.id);
    
    // Парсим methodData для каждой заявки
    const requestsWithParsedData = requests.map(request => ({
      ...request,
      methodData: JSON.parse(request.methodData)
    }));
    
    res.json(requestsWithParsedData);
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===== ADMIN WITHDRAWAL ROUTES =====

// Получить все заявки на вывод (admin only)
app.get("/api/admin/withdrawals", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const requests = await storage.getAllWithdrawalRequests();
    
    // Парсим methodData и добавляем информацию о пользователе
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          methodData: JSON.parse(request.methodData),
          user: user ? {
            username: user.username,
            displayName: user.displayName,
            telegramUsername: user.telegramUsername
          } : null
        };
      })
    );
    
    res.json(requestsWithDetails);
  } catch (error) {
    console.error('Get all withdrawal requests error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Обработать заявку на вывод (admin only)
app.post("/api/admin/withdrawal/:id/process", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const validation = processWithdrawalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid process data", 
        details: validation.error.errors 
      });
    }

    const { status, rejectionReason } = validation.data;
    const withdrawalId = req.params.id;

    // Получаем заявку на вывод
    const withdrawal = await storage.getWithdrawalRequest(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal request not found" });
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return res.status(400).json({ error: "Withdrawal request already processed" });
    }

    // Обновляем статус заявки
    const updatedWithdrawal = await storage.updateWithdrawalRequest(withdrawalId, {
      status,
      processedBy: authResult.adminId,
      processedAt: new Date(),
      rejectionReason
    });

    // Если заявка отклонена, возвращаем средства пользователю
    if (status === 'rejected') {
      await storage.updateUserBalance(
        withdrawal.userId,
        withdrawal.amount,
        `Возврат средств за отклоненную заявку #${withdrawalId}: ${rejectionReason}`,
        'bonus',
        'withdrawal',
        withdrawalId
      );
    }

    // Если заявка завершена, создаем транзакцию завершения
    if (status === 'completed') {
      await storage.createBalanceTransaction({
        userId: withdrawal.userId,
        type: 'withdrawal_completed',
        amount: -withdrawal.amount,
        description: `Вывод средств завершен #${withdrawalId}`,
        sourceType: 'withdrawal',
        sourceId: withdrawalId
      });
    }

    // Логируем действие админа
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'process_withdrawal',
      targetType: 'withdrawal',
      targetId: withdrawalId,
      details: JSON.stringify({ 
        status, 
        rejectionReason, 
        amount: withdrawal.amount,
        userId: withdrawal.userId 
      })
    });

    res.json({
      ...updatedWithdrawal,
      methodData: JSON.parse(updatedWithdrawal.methodData)
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: "Failed to process withdrawal" });
  }
});
  // ===== HEALTH CHECK ROUTE =====
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}