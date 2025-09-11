import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from 'crypto';
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { storage } from "./storage";
import { 
  insertSubmissionSchema, 
  reviewSubmissionSchema, 
  updateUserBalanceSchema,
  linkTelegramSchema,
  insertUserSchema,
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
  const fs = require('fs').promises;
  
  if (filePath) {
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError);
    }
  }
  
  if (previewPath) {
    try {
      await fs.unlink(previewPath);
    } catch (cleanupError) {
      console.error('Failed to cleanup preview file:', cleanupError);
    }
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== AUTHENTICATION ROUTES =====
  
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
      
      // Generate unique filename and write to disk
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname) || `.${fileType.ext}`;
      const filename = `file-${uniqueSuffix}${ext}`;
      uploadedFilePath = path.join('./uploads', filename);
      
      // Ensure uploads directory exists
      const fs = require('fs').promises;
      await fs.mkdir('./uploads', { recursive: true });
      
      // Write file to disk
      await fs.writeFile(uploadedFilePath, req.file.buffer);
      
      // Generate preview/thumbnail for images
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
        return res.status(400).json({ 
          error: "Invalid submission data", 
          details: validation.error.errors 
        });
      }

      const submission = await storage.createSubmission(validation.data);
      
      // Mark success to prevent cleanup
      success = true;
      
      res.json({
        ...submission,
        previewUrl: previewPath ? `/api/preview/${submission.id}` : null
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to process upload" });
    } finally {
      // Cleanup on failure
      if (!success) {
        await cleanupFiles(uploadedFilePath, previewPath);
      }
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

      const submissions = await storage.getAllSubmissions();
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

      const validation = reviewSubmissionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid review data", 
          details: validation.error.errors 
        });
      }

      const { status, reward, rejectionReason } = validation.data;
      
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

  // Update user balance (admin only)
  app.post("/api/admin/user/:id/balance", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const validation = updateUserBalanceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid balance update data", 
          details: validation.error.errors 
        });
      }

      const { amount, reason } = validation.data;
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
  app.get("/api/files/:submissionId", async (req, res) => {
    try {
      const submission = await storage.getSubmission(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ error: "File not found" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Users can only access their own files, admins can access any
      if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Validate file path is safe
      const filePath = path.resolve(submission.filePath);
      const uploadsDir = path.resolve('./uploads');
      
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error('Serve file error:', error);
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

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      // Users can only access their own previews, admins can access any
      if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
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