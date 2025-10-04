// server/routes.ts - Complete fixed version with OAuth integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from 'crypto';
import { fileTypeFromBuffer } from "file-type";
import { storage } from "./storage";
import { promises as fs } from 'fs';
import { cloudStorage } from './fileStorage.js';
import { db } from "./db";
import { users } from "@shared/schema";
import dotenv from "dotenv";
dotenv.config();
import { 
  insertSubmissionSchema, 
  reviewSubmissionSchema, 
  updateUserBalanceSchema,
  processWithdrawalSchema,
  createWithdrawalRequestSchema,
  insertTournamentSchema,
  updateTournamentSchema,
  registerForTournamentSchema,
  grantPremiumSchema,
  updatePremiumSchema,
  type InsertUser,
  type InsertPremiumHistory
} from "@shared/schema";

// File upload configuration
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== EPIC GAMES AUTHENTICATION =====
  
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
      
      let user = await storage.getUserByEpicGamesId(profile.sub);
      
      if (!user) {
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
      
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenPayload = {
        userId: user.id,
        epicGamesId: user.epicGamesId,
        sessionToken,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
      };
      
      const userToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      
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

  // ===== DISCORD OAUTH =====
  
  app.get("/api/auth/discord/login", async (req, res) => {
    try {
      if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
        return res.status(500).json({ 
          error: "Discord authentication is not configured" 
        });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const state = crypto.randomBytes(32).toString('hex');
      const stateData = JSON.stringify({
        state,
        userId: authResult.userId,
        timestamp: Date.now()
      });
      
      const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email',
        state: Buffer.from(stateData).toString('base64')
      });
      
      const authUrl = `https://discord.com/api/oauth2/authorize?${params}`;
      res.json({ authUrl, state });
    } catch (error) {
      console.error('Discord OAuth init error:', error);
      res.status(500).json({ error: "Failed to initialize Discord OAuth" });
    }
  });

  app.get("/api/auth/discord/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('Discord OAuth error:', error);
        return res.redirect(`/?error=discord_oauth_error&message=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || !state) {
        return res.redirect('/?error=missing_oauth_data');
      }

      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch {
        return res.redirect('/?error=invalid_state');
      }

      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return res.redirect('/?error=state_expired');
      }
      
      const tokenParams = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!
      });
      
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Discord token exchange failed:', errorText);
        return res.redirect('/?error=token_exchange_failed');
      }
      
      const tokenData = await tokenResponse.json();
      
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Discord user fetch failed:', errorText);
        return res.redirect('/?error=user_fetch_failed');
      }
      
      const discordUser = await userResponse.json();
      
      const existingUser = await storage.getUserByDiscordId(discordUser.id);
      
      if (existingUser && existingUser.id !== stateData.userId) {
        return res.redirect('/?error=discord_already_linked');
      }
      
      await storage.linkDiscordAccount(stateData.userId, {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordEmail: discordUser.email,
        discordAvatar: discordUser.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined
      });
      
      console.log(`Discord linked for user ${stateData.userId}: ${discordUser.username}`);
      
      res.redirect('/?success=discord_linked');
      
    } catch (error) {
      console.error('Discord callback error:', error);
      res.redirect('/?error=discord_link_failed');
    }
  });

  // ===== TELEGRAM OAUTH =====
  
  app.get("/api/auth/telegram/login", async (req, res) => {
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_BOT_USERNAME) {
        return res.status(500).json({ 
          error: "Telegram authentication is not configured" 
        });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const botUsername = process.env.TELEGRAM_BOT_USERNAME;
      const redirectUrl = `${req.protocol}://${req.get('host')}/api/auth/telegram/callback`;
      
      res.json({ 
        botUsername,
        redirectUrl,
        userId: authResult.userId
      });
    } catch (error) {
      console.error('Telegram OAuth init error:', error);
      res.status(500).json({ error: "Failed to initialize Telegram OAuth" });
    }
  });

  app.post("/api/auth/telegram/callback", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
      
      if (!id || !hash || !auth_date) {
        return res.status(400).json({ error: "Invalid Telegram data" });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN!;
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      
      const dataCheckArr = [];
      if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
      if (first_name) dataCheckArr.push(`first_name=${first_name}`);
      if (id) dataCheckArr.push(`id=${id}`);
      if (last_name) dataCheckArr.push(`last_name=${last_name}`);
      if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
      if (username) dataCheckArr.push(`username=${username}`);
      
      const dataCheckString = dataCheckArr.sort().join('\n');
      
      const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
      
      if (hmac !== hash) {
        return res.status(401).json({ error: "Invalid Telegram authentication" });
      }

      const authTimestamp = parseInt(auth_date);
      const now = Math.floor(Date.now() / 1000);
      if (now - authTimestamp > 86400) {
        return res.status(401).json({ error: "Telegram authentication expired" });
      }

      const existingUser = await storage.getUserByTelegramId(id.toString());
      
      if (existingUser && existingUser.id !== authResult.userId) {
        return res.status(400).json({ error: "Telegram account already linked to another user" });
      }

      await storage.linkTelegramAccount(authResult.userId, {
        telegramChatId: id.toString(),
        telegramUsername: username || `telegram_${id}`,
        telegramFirstName: first_name || undefined,
        telegramLastName: last_name || undefined,
        telegramPhotoUrl: photo_url || undefined
      });
      
      console.log(`Telegram linked for user ${authResult.userId}: ${username || id}`);
      
      res.json({ 
        message: "Telegram linked successfully",
        telegramUsername: username || `telegram_${id}`,
        displayName: [first_name, last_name].filter(Boolean).join(' ') || `Telegram User ${id}`
      });
      
    } catch (error) {
      console.error('Telegram callback error:', error);
      res.status(500).json({ error: "Failed to link Telegram account" });
    }
  });

  // ===== DISCORD/TELEGRAM STATUS & UNLINK =====
  
  app.get("/api/user/:id/discord", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      res.json({ 
        discordUsername: user?.discordUsername || null,
        discordId: user?.discordId || null,
        discordAvatar: user?.discordAvatar || null
      });
    } catch (error) {
      console.error('Check Discord error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/user/:id/discord", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.unlinkDiscordAccount(req.params.id);
      
      res.json({ message: "Discord unlinked successfully" });
    } catch (error) {
      console.error('Unlink Discord error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/:id/telegram", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      res.json({ 
        telegramUsername: user?.telegramUsername || null,
        telegramChatId: user?.telegramChatId || null,
        telegramPhotoUrl: user?.telegramPhotoUrl || null
      });
    } catch (error) {
      console.error('Check Telegram error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/user/:id/telegram", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.unlinkTelegramAccount(req.params.id);
      
      res.json({ message: "Telegram unlinked successfully" });
    } catch (error) {
      console.error('Unlink Telegram error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== AUTH STATUS =====
  
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
        isAdmin: user.isAdmin,
        subscriptionScreenshotStatus: user.subscriptionScreenshotStatus,
        subscriptionScreenshotUrl: user.subscriptionScreenshotUrl,
        subscriptionScreenshotUploadedAt: user.subscriptionScreenshotUploadedAt,
        subscriptionScreenshotReviewedAt: user.subscriptionScreenshotReviewedAt,
        subscriptionScreenshotRejectionReason: user.subscriptionScreenshotRejectionReason,
        telegramUsername: user.telegramUsername,
        discordUsername: user.discordUsername,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ error: "Authentication verification failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // ===== USER ROUTES =====
  
  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { epicGamesId, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/:id/premium", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const now = new Date();
      const isActive = user.premiumEndDate && new Date(user.premiumEndDate) > now;
      const daysRemaining = user.premiumEndDate 
        ? Math.max(0, Math.ceil((new Date(user.premiumEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      res.json({
        tier: user.premiumTier || 'none',
        isActive,
        startDate: user.premiumStartDate,
        endDate: user.premiumEndDate,
        daysRemaining,
        autoRenew: user.premiumAutoRenew,
        source: user.premiumSource,
      });

    } catch (error) {
      console.error('Get user premium status error:', error);
      res.status(500).json({ error: "Failed to fetch premium status" });
    }
  });

  // ===== FILE UPLOAD =====
  
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { userId } = authResult;

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
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname) || `.${fileType.ext}`;
      const filename = `${userId}-${uniqueSuffix}${ext}`;
      
      const cloudinaryResult = await cloudStorage.uploadFile(
        req.file.buffer,
        filename,
        detectedFileType
      );
      
      const submissionData = {
        userId: userId,
        filename: cloudinaryResult.public_id,
        originalFilename: req.file.originalname,
        fileType: detectedFileType,
        fileSize: req.file.size,
        filePath: cloudinaryResult.secure_url,
        category: req.body.category,
        additionalText: req.body.additionalText || null,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url
      };

      const validation = insertSubmissionSchema.safeParse(submissionData);
      if (!validation.success) {
        await cloudStorage.deleteFile(cloudinaryResult.public_id);
        throw new Error(`Invalid submission data: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }

      const submission = await storage.createSubmission(validation.data);
      
      const thumbnailUrl = cloudStorage.generateThumbnail(cloudinaryResult.public_id);
      
      res.json({
        ...submission,
        thumbnailUrl,
        fileUrl: cloudinaryResult.secure_url
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to process upload";
      res.status(500).json({ error: errorMessage });
    }
  });

  // ===== SUBMISSION ROUTES =====
  
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

  app.get("/api/submissions/user/:userId", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

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

      if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(submission);
    } catch (error) {
      console.error('Get submission error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/files/:submissionId", async (req, res) => {
    const submissionId = req.params.submissionId;
    
    try {
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "File not found - submission not found" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (submission.userId !== authResult.userId && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (submission.filePath.startsWith('https://res.cloudinary.com')) {
        return res.redirect(submission.filePath);
      }

      const filePath = path.resolve(submission.filePath);
      const uploadsDir = path.resolve('./uploads');
      
      if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: "Access denied - invalid path" });
      }
      
      try {
        await fs.access(filePath);
        res.sendFile(filePath);
      } catch {
        return res.status(404).json({ error: "File not found on disk" });
      }
      
    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

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

      if (submission.cloudinaryPublicId) {
        const thumbnailUrl = cloudStorage.generateThumbnail(submission.cloudinaryPublicId);
        return res.redirect(thumbnailUrl);
      }

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

  // ===== ADMIN ROUTES =====

  app.post("/api/admin/submission/:id/review", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const reviewData = {
        status: req.body.status,
        reward: req.body.reward ? Number(req.body.reward) : undefined,
        rejectionReason: req.body.rejectionReason
      };

      const validation = reviewSubmissionSchema.safeParse(reviewData);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid review data", 
          details: validation.error.errors 
        });
      }

      const { status, reward, rejectionReason } = validation.data;
      
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

      if (status === 'approved' && reward) {
        await storage.updateUserBalance(submission.userId, reward);
        
        await storage.createAdminAction({
          adminId: authResult.adminId,
          action: 'approve_submission',
          targetType: 'submission',
          targetId: submission.id,
          details: JSON.stringify({ reward, submissionId: submission.id })
        });
      } else if (status === 'rejected') {
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

      const balanceData = {
        amount: req.body.amount ? Number(req.body.amount) : undefined,
        reason: req.body.reason
      };

      const validation = updateUserBalanceSchema.safeParse(balanceData);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid balance update data", 
          details: validation.error.errors 
        });
      }

      const { amount, reason } = validation.data;
      
      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (!reason?.trim()) {
        return res.status(400).json({ error: "Reason is required" });
      }

      const user = await storage.updateUserBalance(req.params.id, amount);
      
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

  // ===== PREMIUM ROUTES =====

  app.post("/api/admin/user/:userId/premium", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const validation = grantPremiumSchema.safeParse({
        userId: req.params.userId,
        tier: req.body.tier,
        durationDays: Number(req.body.durationDays),
        reason: req.body.reason,
        source: req.body.source
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid premium grant data", 
          details: validation.error.errors 
        });
      }

      const { tier, durationDays, reason, source } = validation.data;
      const userId = req.params.userId;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const now = new Date();
      const startDate = user.premiumEndDate && new Date(user.premiumEndDate) > now 
        ? new Date(user.premiumEndDate)
        : now;
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      const updatedUser = await storage.updateUser(userId, {
        premiumTier: tier,
        premiumStartDate: startDate,
        premiumEndDate: endDate,
        premiumSource: source,
        premiumGiftedBy: authResult.adminId,
        premiumLastChecked: now,
      });

      await storage.createPremiumHistory({
        userId,
        tier,
        startDate,
        endDate,
        source,
        grantedBy: authResult.adminId,
        reason,
        autoRenewed: false,
      });

      await storage.createAdminAction({
        adminId: authResult.adminId,
        action: 'grant_premium',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ tier, durationDays, reason, startDate, endDate })
      });

      res.json({
        message: "Premium granted successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          premiumTier: updatedUser.premiumTier,
          premiumStartDate: updatedUser.premiumStartDate,
          premiumEndDate: updatedUser.premiumEndDate,
        }
      });

    } catch (error) {
      console.error('Grant premium error:', error);
      res.status(500).json({ error: "Failed to grant premium" });
    }
  });

  app.get("/api/admin/premium-users", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const users = await storage.getPremiumUsers();
      
      const now = new Date();
      const usersWithStatus = users.map(user => ({
        ...user,
        isExpired: user.premiumEndDate ? new Date(user.premiumEndDate) < now : true,
        daysRemaining: user.premiumEndDate 
          ? Math.max(0, Math.ceil((new Date(user.premiumEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0
      }));

      res.json(usersWithStatus);

    } catch (error) {
      console.error('Get premium users error:', error);
      res.status(500).json({ error: "Failed to fetch premium users" });
    }
  });

  // ===== BALANCE & WITHDRAWAL ROUTES =====

  app.get("/api/user/:id/balance/transactions", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

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

  app.post("/api/user/:id/withdrawal", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const validation = createWithdrawalRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid withdrawal data", 
          details: validation.error.errors 
        });
      }

      const { amount, method, methodData } = validation.data;

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const activeRequests = await storage.getUserWithdrawalRequests(req.params.id);
      const pendingRequests = activeRequests.filter(r => r.status === 'pending' || r.status === 'processing');
      
      if (pendingRequests.length > 0) {
        return res.status(400).json({ 
          error: "You already have a pending withdrawal request" 
        });
      }

      const withdrawalRequest = await storage.createWithdrawalRequest({
        userId: req.params.id,
        amount,
        method,
        methodData: JSON.stringify(methodData),
        status: 'pending'
      });

      await storage.updateUserBalance(
        req.params.id, 
        -amount, 
        `Withdrawal request #${withdrawalRequest.id}`,
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

  app.get("/api/user/:id/withdrawals", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const requests = await storage.getUserWithdrawalRequests(req.params.id);
      
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

  app.get("/api/admin/withdrawals", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const requests = await storage.getAllWithdrawalRequests();
      
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

      const withdrawal = await storage.getWithdrawalRequest(withdrawalId);
      if (!withdrawal) {
        return res.status(404).json({ error: "Withdrawal request not found" });
      }

      if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
        return res.status(400).json({ error: "Withdrawal request already processed" });
      }

      const updatedWithdrawal = await storage.updateWithdrawalRequest(withdrawalId, {
        status,
        processedBy: authResult.adminId,
        processedAt: new Date(),
        rejectionReason
      });

      if (status === 'rejected') {
        await storage.updateUserBalance(
          withdrawal.userId,
          withdrawal.amount,
          `Refund for rejected withdrawal #${withdrawalId}: ${rejectionReason}`,
          'bonus',
          'withdrawal',
          withdrawalId
        );
      }

      if (status === 'completed') {
        await storage.createBalanceTransaction({
          userId: withdrawal.userId,
          type: 'withdrawal_completed',
          amount: -withdrawal.amount,
          description: `Withdrawal completed #${withdrawalId}`,
          sourceType: 'withdrawal',
          sourceId: withdrawalId
        });
      }

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

  // ===== SUBSCRIPTION SCREENSHOT =====

  app.post("/api/user/subscription-screenshot", upload.single('screenshot'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No screenshot uploaded" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }
      
      const { userId } = authResult;

      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
        return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." });
      }

      const currentUser = await storage.getUser(userId);
      
      if (currentUser?.subscriptionScreenshotStatus === 'approved') {
        console.log(`User ${userId} (${currentUser.username}) is re-uploading subscription screenshot`);
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname) || `.${fileType.ext}`;
      const filename = `subscription-${userId}-${uniqueSuffix}${ext}`;
      
      const cloudinaryResult = await cloudStorage.uploadFile(
        req.file.buffer,
        filename,
        'image'
      );
      
      const updatedUser = await storage.updateUser(userId, {
        subscriptionScreenshotUrl: cloudinaryResult.secure_url,
        subscriptionScreenshotStatus: 'approved',
        subscriptionScreenshotUploadedAt: new Date(),
        subscriptionScreenshotReviewedAt: new Date(),
        subscriptionScreenshotReviewedBy: 'system',
        subscriptionScreenshotRejectionReason: null,
        updatedAt: new Date()
      });

      await storage.createAdminAction({
        adminId: 'system',
        action: currentUser?.subscriptionScreenshotStatus === 'approved' ? 'reupload_subscription_screenshot' : 'auto_approve_subscription_screenshot',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ 
          screenshotUrl: cloudinaryResult.secure_url,
          autoApproved: true,
          previousStatus: currentUser?.subscriptionScreenshotStatus || 'none'
        })
      });
      
      res.json({
        message: "Screenshot uploaded and approved successfully",
        status: updatedUser.subscriptionScreenshotStatus,
        uploadedAt: updatedUser.subscriptionScreenshotUploadedAt,
        autoApproved: true,
        overwritten: currentUser?.subscriptionScreenshotStatus === 'approved'
      });
      
    } catch (error) {
      console.error('Subscription screenshot upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to upload subscription screenshot";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/user/:id/subscription-screenshot", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        status: user.subscriptionScreenshotStatus || 'none',
        uploadedAt: user.subscriptionScreenshotUploadedAt,
        reviewedAt: user.subscriptionScreenshotReviewedAt,
        rejectionReason: user.subscriptionScreenshotRejectionReason
      });
    } catch (error) {
      console.error('Get subscription screenshot status error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/subscription-screenshots", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const users = await storage.getAllUsers();
      
      const subscriptionScreenshots = await Promise.all(
        users
          .filter(user => user.subscriptionScreenshotStatus && user.subscriptionScreenshotStatus !== 'none')
          .map(async (user) => {
            try {
              const stats = await storage.getUserStats(user.id);
              return {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                subscriptionScreenshotUrl: user.subscriptionScreenshotUrl,
                subscriptionScreenshotStatus: user.subscriptionScreenshotStatus,
                subscriptionScreenshotUploadedAt: user.subscriptionScreenshotUploadedAt,
                subscriptionScreenshotReviewedAt: user.subscriptionScreenshotReviewedAt,
                subscriptionScreenshotReviewedBy: user.subscriptionScreenshotReviewedBy,
                subscriptionScreenshotRejectionReason: user.subscriptionScreenshotRejectionReason,
                balance: user.balance,
                stats: {
                  totalSubmissions: stats.totalSubmissions,
                  approvedSubmissions: stats.approvedSubmissions,
                  totalEarnings: stats.totalEarnings
                }
              };
            } catch (error) {
              return {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                subscriptionScreenshotUrl: user.subscriptionScreenshotUrl,
                subscriptionScreenshotStatus: user.subscriptionScreenshotStatus,
                subscriptionScreenshotUploadedAt: user.subscriptionScreenshotUploadedAt,
                subscriptionScreenshotReviewedAt: user.subscriptionScreenshotReviewedAt,
                subscriptionScreenshotReviewedBy: user.subscriptionScreenshotReviewedBy,
                subscriptionScreenshotRejectionReason: user.subscriptionScreenshotRejectionReason,
                balance: user.balance,
                stats: {
                  totalSubmissions: 0,
                  approvedSubmissions: 0,
                  totalEarnings: 0
                }
              };
            }
          })
      );

      subscriptionScreenshots.sort((a, b) => {
        if (a.subscriptionScreenshotStatus === 'pending' && b.subscriptionScreenshotStatus !== 'pending') return -1;
        if (b.subscriptionScreenshotStatus === 'pending' && a.subscriptionScreenshotStatus !== 'pending') return 1;
        
        const dateA = new Date(a.subscriptionScreenshotUploadedAt || 0).getTime();
        const dateB = new Date(b.subscriptionScreenshotUploadedAt || 0).getTime();
        return dateB - dateA;
      });

      res.json(subscriptionScreenshots);
    } catch (error) {
      console.error('Get subscription screenshots error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/subscription-screenshot/:userId/review", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { status, rejectionReason } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      if (status === 'rejected' && !rejectionReason?.trim()) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting screenshot" });
      }

      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.subscriptionScreenshotUrl) {
        return res.status(400).json({ error: "User has no subscription screenshot to review" });
      }

      const updatedUser = await storage.updateUser(req.params.userId, {
        subscriptionScreenshotStatus: status,
        subscriptionScreenshotReviewedAt: new Date(),
        subscriptionScreenshotReviewedBy: authResult.adminId,
        subscriptionScreenshotRejectionReason: status === 'rejected' ? rejectionReason : null
      });

      await storage.createAdminAction({
        adminId: authResult.adminId,
        action: `${status}_subscription_screenshot`,
        targetType: 'user',
        targetId: req.params.userId,
        details: JSON.stringify({ 
          status, 
          rejectionReason: status === 'rejected' ? rejectionReason : null,
          screenshotUrl: user.subscriptionScreenshotUrl,
          previousStatus: user.subscriptionScreenshotStatus,
          isReReview: user.subscriptionScreenshotReviewedBy !== null && user.subscriptionScreenshotReviewedBy !== 'system'
        })
      });

      res.json({
        message: `Subscription screenshot ${status} successfully`,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          subscriptionScreenshotStatus: updatedUser.subscriptionScreenshotStatus,
          subscriptionScreenshotReviewedAt: updatedUser.subscriptionScreenshotReviewedAt,
          subscriptionScreenshotRejectionReason: updatedUser.subscriptionScreenshotRejectionReason
        }
      });

    } catch (error) {
      console.error('Review subscription screenshot error:', error);
      res.status(500).json({ error: "Failed to review subscription screenshot" });
    }
  });

  // ===== TOURNAMENTS =====

  app.get("/api/tournaments", async (req, res) => {
    try {
      const tournaments = await storage.getActiveTournaments();
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const authResult = await authenticateUser(req);
          if ('userId' in authResult) {
            const tournamentsWithStatus = await Promise.all(
              tournaments.map(async (tournament) => {
                const registration = await storage.getTournamentRegistration(
                  tournament.id,
                  authResult.userId
                );
                return {
                  ...tournament,
                  isUserRegistered: !!registration,
                  userRegistration: registration,
                };
              })
            );
            return res.json(tournamentsWithStatus);
          }
      } catch (error) {
        // If auth fails, just return tournaments without user status
        console.log('Auth check failed, returning tournaments without user status');
      }
    }
    
    res.json(tournaments);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

// Get single tournament with details
app.get("/api/tournament/:id", async (req, res) => {
  try {
    const tournament = await storage.getTournamentWithDetails(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if user is registered
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const authResult = await authenticateUser(req);
        if ('userId' in authResult) {
          const registration = await storage.getTournamentRegistration(
            tournament.id,
            authResult.userId
          );
          return res.json({
            ...tournament,
            isUserRegistered: !!registration,
            userRegistration: registration,
          });
        }
      } catch (error) {
        // Auth failed, return tournament without user status
      }
    }

    res.json(tournament);
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: "Failed to fetch tournament" });
  }
});

// Register for tournament
app.post("/api/tournament/:id/register", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, user } = authResult;
    const tournamentId = req.params.id;

    // Validate request body
    const validation = registerForTournamentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid registration data", 
        details: validation.error.errors 
      });
    }

    const { teamName, additionalInfo } = validation.data;

    // Check if tournament exists
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if registration is open
    const now = new Date();
    if (now < new Date(tournament.registrationStartDate)) {
      return res.status(400).json({ error: "Registration has not started yet" });
    }
    if (now > new Date(tournament.registrationEndDate)) {
      return res.status(400).json({ error: "Registration has closed" });
    }
    if (tournament.status !== 'registration_open' && tournament.status !== 'upcoming') {
      return res.status(400).json({ error: "Registration is not available" });
    }

    // Check if already registered
    const existingRegistration = await storage.getTournamentRegistration(tournamentId, userId);
    if (existingRegistration) {
      return res.status(400).json({ error: "You are already registered for this tournament" });
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants) {
      return res.status(400).json({ error: "Tournament is full" });
    }

    // Check balance for paid tournaments
    if (tournament.entryFee > 0) {
      if (user.balance < tournament.entryFee) {
        return res.status(400).json({ 
          error: `Insufficient balance. Required: ${tournament.entryFee} ₽, Available: ${user.balance} ₽` 
        });
      }

      // Deduct entry fee
      await storage.updateUserBalance(
        userId,
        -tournament.entryFee,
        `Entry fee for tournament: ${tournament.name}`,
        'withdrawal_request',
        'tournament',
        tournamentId
      );
    }

    // Create registration
    const registration = await storage.registerForTournament({
      tournamentId,
      userId,
      status: tournament.entryFee > 0 ? 'paid' : 'registered',
      paidAmount: tournament.entryFee,
      paidAt: tournament.entryFee > 0 ? new Date() : null,
      teamName: teamName || null,
      additionalInfo: additionalInfo || null,
    });

    // Increment participant count
    await storage.incrementTournamentParticipants(tournamentId);

    // Update tournament status if needed
    const updatedTournament = await storage.getTournament(tournamentId);
    if (updatedTournament && 
        updatedTournament.status === 'upcoming' && 
        now >= new Date(tournament.registrationStartDate)) {
      await storage.updateTournament(tournamentId, { status: 'registration_open' });
    }

    console.log(`✅ User ${userId} registered for tournament ${tournamentId}`);

    res.json({
      message: "Successfully registered for tournament",
      registration,
      tournament: await storage.getTournament(tournamentId),
    });

  } catch (error) {
    console.error('Tournament registration error:', error);
    res.status(500).json({ error: "Failed to register for tournament" });
  }
});

// Cancel tournament registration
app.delete("/api/tournament/:id/register", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId } = authResult;
    const tournamentId = req.params.id;

    // Get tournament
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Get registration
    const registration = await storage.getTournamentRegistration(tournamentId, userId);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Check if cancellation is allowed
    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({ error: "Cannot cancel registration for ongoing or completed tournament" });
    }

    // Refund entry fee if paid
    if (registration.paidAmount && registration.paidAmount > 0) {
      await storage.updateUserBalance(
        userId,
        registration.paidAmount,
        `Refund for cancelled tournament registration: ${tournament.name}`,
        'bonus',
        'tournament',
        tournamentId
      );
    }

    // Delete registration
    await storage.cancelTournamentRegistration(registration.id);

    // Decrement participant count
    await storage.decrementTournamentParticipants(tournamentId);

    console.log(`✅ User ${userId} cancelled registration for tournament ${tournamentId}`);

    res.json({
      message: "Registration cancelled successfully",
      refundAmount: registration.paidAmount || 0,
    });

  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Get user's tournament registrations
app.get("/api/user/:id/tournaments", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Users can only see their own registrations, admins can see any
    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const registrations = await storage.getUserTournamentRegistrations(req.params.id);
    
    // Fetch tournament details for each registration
    const registrationsWithTournaments = await Promise.all(
      registrations.map(async (reg) => {
        const tournament = await storage.getTournament(reg.tournamentId);
        return {
          ...reg,
          tournament,
        };
      })
    );

    res.json(registrationsWithTournaments);
  } catch (error) {
    console.error('Get user tournaments error:', error);
    res.status(500).json({ error: "Failed to fetch user tournaments" });
  }
});

// ===== ADMIN TOURNAMENT ROUTES =====

// Create tournament (admin only)
app.post("/api/admin/tournament", upload.single('image'), async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    let imageUrl = null;
    let cloudinaryPublicId = null;

    // Handle image upload if provided
    if (req.file) {
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
        return res.status(400).json({ error: "Invalid image type" });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `tournament-${uniqueSuffix}`;
      
      const cloudinaryResult = await cloudStorage.uploadFile(
        req.file.buffer,
        filename,
        'image'
      );
      
      imageUrl = cloudinaryResult.secure_url;
      cloudinaryPublicId = cloudinaryResult.public_id;
    }

    // Parse and validate tournament data
    const tournamentData = {
      ...req.body,
      prize: parseInt(req.body.prize) || 0,
      entryFee: parseInt(req.body.entryFee) || 0,
      maxParticipants: req.body.maxParticipants ? parseInt(req.body.maxParticipants) : null,
      imageUrl,
      cloudinaryPublicId,
      createdBy: authResult.adminId,
    };

    const validation = insertTournamentSchema.safeParse(tournamentData);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid tournament data", 
        details: validation.error.errors 
      });
    }

    const tournament = await storage.createTournament(validation.data);

    // Log admin action
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'create_tournament',
      targetType: 'tournament',
      targetId: tournament.id,
      details: JSON.stringify({ 
        name: tournament.name,
        prize: tournament.prize,
        entryFee: tournament.entryFee,
      })
    });

    console.log(`✅ Tournament created: ${tournament.id} by admin ${authResult.adminId}`);

    res.json(tournament);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

// Update tournament (admin only)
app.patch("/api/admin/tournament/:id", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const validation = updateTournamentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid update data", 
        details: validation.error.errors 
      });
    }

    const tournament = await storage.updateTournament(req.params.id, validation.data);

    // Log admin action
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'update_tournament',
      targetType: 'tournament',
      targetId: tournament.id,
      details: JSON.stringify(validation.data)
    });

    res.json(tournament);
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ error: "Failed to update tournament" });
  }
});

// Delete tournament (admin only)
app.delete("/api/admin/tournament/:id", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const tournament = await storage.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Refund all participants
    const registrations = await storage.getTournamentRegistrations(req.params.id);
    for (const reg of registrations) {
      if (reg.paidAmount && reg.paidAmount > 0) {
        await storage.updateUserBalance(
          reg.userId,
          reg.paidAmount,
          `Refund for deleted tournament: ${tournament.name}`,
          'bonus',
          'tournament',
          tournament.id
        );
      }
    }

    await storage.deleteTournament(req.params.id);

    // Log admin action
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'delete_tournament',
      targetType: 'tournament',
      targetId: req.params.id,
      details: JSON.stringify({ 
        name: tournament.name,
        refundedParticipants: registrations.length,
      })
    });

    res.json({ message: "Tournament deleted successfully" });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: "Failed to delete tournament" });
  }
});

// Get all tournaments including completed (admin only)
app.get("/api/admin/tournaments", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const tournaments = await storage.getAllTournaments();
    res.json(tournaments);
  } catch (error) {
    console.error('Get all tournaments error:', error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});
// ===== ADMIN SUBSCRIPTION SCREENSHOT ROUTES =====

// Get all pending subscription screenshots (admin only)
app.get("/api/admin/subscription-screenshots", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const users = await storage.getUsersWithPendingSubscriptionScreenshots();
    res.json(users);
  } catch (error) {
    console.error('Get pending subscription screenshots error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Review subscription screenshot (admin only)
app.post("/api/admin/subscription-screenshot/:userId/review", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { status, rejectionReason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: "Rejection reason is required when rejecting screenshot" });
    }

    const user = await storage.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.subscriptionScreenshotStatus !== 'pending') {
      return res.status(400).json({ error: "No pending screenshot to review" });
    }

    // Update user subscription screenshot status
    const updatedUser = await storage.updateUser(req.params.userId, {
      subscriptionScreenshotStatus: status,
      subscriptionScreenshotReviewedAt: new Date(),
      subscriptionScreenshotReviewedBy: authResult.adminId,
      subscriptionScreenshotRejectionReason: status === 'rejected' ? rejectionReason : null
    });

    // Log admin action
    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: `${status}_subscription_screenshot`,
      targetType: 'user',
      targetId: req.params.userId,
      details: JSON.stringify({ 
        status, 
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        screenshotUrl: user.subscriptionScreenshotUrl
      })
    });

    console.log(`✅ Subscription screenshot ${status} for user ${req.params.userId} by admin ${authResult.adminId}`);

    res.json({
      message: `Subscription screenshot ${status} successfully`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        subscriptionScreenshotStatus: updatedUser.subscriptionScreenshotStatus,
        subscriptionScreenshotReviewedAt: updatedUser.subscriptionScreenshotReviewedAt,
        subscriptionScreenshotRejectionReason: updatedUser.subscriptionScreenshotRejectionReason
      }
    });

  } catch (error) {
    console.error('Review subscription screenshot error:', error);
    res.status(500).json({ error: "Failed to review subscription screenshot" });
  }
});

// Get subscription screenshot file (admin only)
app.get("/api/admin/subscription-screenshot/:userId/file", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const user = await storage.getUser(req.params.userId);
    if (!user || !user.subscriptionScreenshotUrl) {
      return res.status(404).json({ error: "Screenshot not found" });
    }

    // For Cloudinary URLs, just redirect
    if (user.subscriptionScreenshotUrl.startsWith('https://res.cloudinary.com')) {
      return res.redirect(user.subscriptionScreenshotUrl);
    }

    res.status(404).json({ error: "Screenshot file not accessible" });
  } catch (error) {
    console.error('Get subscription screenshot file error:', error);
    res.status(500).json({ error: "Internal server error" });
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