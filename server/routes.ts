import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from 'crypto';
import { fileTypeFromBuffer } from "file-type";
import { storage } from "./storage";
import { territoryStorage } from "./territory-storage";
import { promises as fs } from 'fs';
import { cloudStorage } from './fileStorage.js';
import { discordPremiumService } from './discordPremiumService';
import { discordTournamentService } from './discordTournamentService';
import { db } from "./db";
import {
  users,
  tournaments,
  tournamentRegistrations,
  tournamentTeams,
  tournamentTeamMembers,
  tournamentTeamInvites,
  balanceTransactions,
  dropMapSettings,
  dropMapEligiblePlayers
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
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
  getKillTypeFromCategory,
  type InsertUser
} from "@shared/schema";

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
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
    return { error: "Authentication required", status: 401 };
  }
  
  const token = authHeader.substring(7);
  if (!token) return { error: "Invalid token", status: 401 };

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (decoded.exp && decoded.exp < Date.now()) {
      return { error: "Token expired", status: 401 };
    }

    const user = await storage.getUser(decoded.userId);
    if (!user) return { error: "User not found", status: 404 };
    
    return { userId: decoded.userId, user };
  } catch (error) {
    return { error: "Invalid token format", status: 401 };
  }
};

// Admin authentication middleware
const authenticateAdmin = async (req: any): Promise<{ adminId: string, admin: any } | { error: string, status: number }> => {
  const authResult = await authenticateUser(req);
  if ('error' in authResult) return authResult;

  if (!authResult.user.isAdmin) {
    return { error: "Admin access required", status: 403 };
  }

  return { adminId: authResult.user.id, admin: authResult.user };
};

// Helper function to generate session token
const generateSessionToken = (user: any) => {
  const tokenPayload = {
    userId: user.id,
    epicGamesId: user.epicGamesId,
    sessionToken: crypto.randomBytes(32).toString('hex'),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
  };
  return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== EPIC GAMES AUTHENTICATION =====
  
  app.get("/api/auth/epic/login", async (req, res) => {
    try {
      if (!process.env.EPIC_CLIENT_ID || !process.env.EPIC_REDIRECT_URI) {
        return res.status(500).json({ error: "Epic Games authentication not configured" });
      }

      const state = crypto.randomBytes(32).toString('hex');
      const params = new URLSearchParams({
        client_id: process.env.EPIC_CLIENT_ID,
        redirect_uri: process.env.EPIC_REDIRECT_URI,
        response_type: 'code',
        scope: 'basic_profile',
        state: state,
        nonce: crypto.randomBytes(32).toString('hex')
      });
      
      res.json({ 
        authUrl: `https://www.epicgames.com/id/authorize?${params}`, 
        state 
      });
    } catch (error) {
      console.error('Epic login error:', error);
      res.status(500).json({ error: "Failed to initialize Epic Games login" });
    }
  });
  
  app.get("/api/auth/epic/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
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
        console.error('Token exchange failed:', await tokenResponse.text());
        return res.redirect('/?error=token_exchange_failed');
      }
      
      const tokenData = await tokenResponse.json();
      
      // Get user profile
      const profileResponse = await fetch('https://api.epicgames.dev/epic/oauth/v2/userInfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      
      if (!profileResponse.ok) {
        console.error('Profile fetch failed:', await profileResponse.text());
        return res.redirect('/?error=profile_fetch_failed');
      }
      
      const profile = await profileResponse.json();
      
      // Find or create user
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
      
      const userToken = generateSessionToken(user);
      
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
        return res.status(500).json({ error: "Discord authentication not configured" });
      }

      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const state = Buffer.from(JSON.stringify({
        state: crypto.randomBytes(32).toString('hex'),
        userId: authResult.userId,
        timestamp: Date.now()
      })).toString('base64');
      
      const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email',
        state
      });
      
      res.json({ 
        authUrl: `https://discord.com/api/oauth2/authorize?${params}`, 
        state 
      });
    } catch (error) {
      console.error('Discord OAuth init error:', error);
      res.status(500).json({ error: "Failed to initialize Discord OAuth" });
    }
  });

  app.get("/api/auth/discord/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect(`/?error=discord_oauth_error&message=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || !state) {
        return res.redirect('/?error=missing_oauth_data');
      }

      // Decode and validate state
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch {
        return res.redirect('/?error=invalid_state');
      }

      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return res.redirect('/?error=state_expired');
      }
      
      // Exchange code for token
      const tokenParams = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!
      });
      
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
      });
      
      if (!tokenResponse.ok) {
        console.error('Discord token exchange failed:', await tokenResponse.text());
        return res.redirect('/?error=token_exchange_failed');
      }
      
      const tokenData = await tokenResponse.json();
      
      // Get Discord user
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      
      if (!userResponse.ok) {
        console.error('Discord user fetch failed:', await userResponse.text());
        return res.redirect('/?error=user_fetch_failed');
      }
      
      const discordUser = await userResponse.json();
      
      // Check if Discord account already linked to different user
      const existingUser = await storage.getUserByDiscordId(discordUser.id);
      if (existingUser && existingUser.id !== stateData.userId) {
        return res.redirect('/?error=discord_already_linked');
      }
      
      // Link Discord account
      await storage.linkDiscordAccount(stateData.userId, {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordEmail: discordUser.email,
        discordAvatar: discordUser.avatar 
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : undefined
      });

      discordPremiumService.updateUserPremiumFromDiscord(stateData.userId).catch(console.error);
      
      console.log(`✅ Discord linked for user ${stateData.userId}: ${discordUser.username}`);
      res.redirect('/?success=discord_linked');
      
    } catch (error) {
      console.error('Discord callback error:', error);
      res.redirect('/?error=discord_link_failed');
    }
  });

  // ===== TELEGRAM BOT INTEGRATION =====
  
  /**
   * Generate Telegram login link for user
   * User clicks this link, opens Telegram bot, bot sends verification code
   */
  app.get("/api/auth/telegram/init", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const botUsername = process.env.TELEGRAM_BOT_USERNAME;
      if (!botUsername) {
        return res.status(500).json({ error: "Telegram bot not configured" });
      }

      // Generate verification code
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store verification code temporarily (you'll need to add this to storage)
      await storage.createTelegramVerification({
        userId: authResult.userId,
        code: verificationCode,
        expiresAt
      });

      // Return bot link with start parameter
      const botLink = `https://t.me/${botUsername}?start=${verificationCode}`;

      res.json({ 
        botLink,
        botUsername,
        verificationCode,
        expiresAt,
        instructions: "Click the link to open Telegram bot and send the verification code"
      });
    } catch (error) {
      console.error('Telegram init error:', error);
      res.status(500).json({ error: "Failed to initialize Telegram linking" });
    }
  });

  /**
   * Webhook endpoint for Telegram bot to send user data after verification
   * This should be called by your Telegram bot when user sends verification code
   */
  app.post("/api/auth/telegram/webhook", async (req, res) => {
    try {
      // Verify webhook secret to ensure it's from your bot
      const webhookSecret = req.headers['x-telegram-bot-token'];
      if (webhookSecret !== process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }

      const { 
        verificationCode, 
        telegramId, 
        username, 
        firstName, 
        lastName, 
        photoUrl 
      } = req.body;

      if (!verificationCode || !telegramId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Find verification record
      const verification = await storage.getTelegramVerification(verificationCode);
      if (!verification) {
        return res.status(404).json({ error: "Invalid or expired verification code" });
      }

      if (new Date() > new Date(verification.expiresAt)) {
        await storage.deleteTelegramVerification(verificationCode);
        return res.status(400).json({ error: "Verification code expired" });
      }

      // Check if Telegram account already linked
      const existingUser = await storage.getUserByTelegramId(telegramId.toString());
      if (existingUser && existingUser.id !== verification.userId) {
        return res.status(400).json({ error: "Telegram account already linked to another user" });
      }

      // Link Telegram account
      await storage.linkTelegramAccount(verification.userId, {
        telegramChatId: telegramId.toString(),
        telegramUsername: username || `tg_${telegramId}`,
        telegramFirstName: firstName || undefined,
        telegramLastName: lastName || undefined,
        telegramPhotoUrl: photoUrl || undefined
      });

      // Delete verification record
      await storage.deleteTelegramVerification(verificationCode);

      console.log(`✅ Telegram linked for user ${verification.userId}: ${username || telegramId}`);

      res.json({ 
        success: true,
        message: "Telegram account linked successfully"
      });

    } catch (error) {
      console.error('Telegram webhook error:', error);
      res.status(500).json({ error: "Failed to process Telegram linking" });
    }
  });

  /**
   * Check Telegram linking status
   */
  app.get("/api/auth/telegram/status", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { verificationCode } = req.query;
      
      if (verificationCode) {
        // Check if verification was completed
        const verification = await storage.getTelegramVerification(verificationCode as string);
        if (!verification) {
          // Verification completed or expired
          const user = await storage.getUser(authResult.userId);
          if (user?.telegramChatId) {
            return res.json({ 
              status: 'completed',
              telegramUsername: user.telegramUsername,
              telegramChatId: user.telegramChatId
            });
          }
          return res.json({ status: 'expired' });
        }
        return res.json({ status: 'pending' });
      }

      // Return current Telegram link status
      const user = await storage.getUser(authResult.userId);
      res.json({ 
        linked: !!user?.telegramChatId,
        telegramUsername: user?.telegramUsername || null,
        telegramChatId: user?.telegramChatId || null,
        telegramPhotoUrl: user?.telegramPhotoUrl || null
      });

    } catch (error) {
      console.error('Telegram status error:', error);
      res.status(500).json({ error: "Failed to check Telegram status" });
    }
  });

  // ===== UNLINK SOCIAL ACCOUNTS =====
  
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
        telegramChatId: user.telegramChatId,
        discordUsername: user.discordUsername,
        premiumTier: user.premiumTier,
        premiumEndDate: user.premiumEndDate,
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

  app.get("/api/users/search", async (req, res) => {
    try {
      const authResult = await authenticateUser(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const { query } = req.query;
      if (query === undefined || query === null || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const searchTerm = query.toLowerCase();

      // If query is empty, return all users (limited to 100)
      let matchingUsers;
      if (searchTerm.trim() === '') {
        matchingUsers = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .limit(100);
      } else {
        // Search by username or displayName
        matchingUsers = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(
            sql`LOWER(${users.username}) LIKE ${`%${searchTerm}%`} OR LOWER(${users.displayName}) LIKE ${`%${searchTerm}%`}`
          )
          .limit(100);
      }

      res.json(matchingUsers);
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ error: "Failed to search users" });
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
    
    // ИСПРАВЛЕНИЕ: обрабатываем additionalText правильно
    const additionalText = req.body.additionalText;
    const processedAdditionalText = (!additionalText || additionalText === '-') 
      ? null 
      : additionalText.trim();
    
    const submissionData = {
      userId: userId,
      filename: cloudinaryResult.public_id,
      originalFilename: req.file.originalname,
      fileType: detectedFileType,
      fileSize: req.file.size,
      filePath: cloudinaryResult.secure_url,
      category: req.body.category,
      additionalText: processedAdditionalText || "-",
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

    const actions = await storage.getAdminActionsWithUsers();
    res.json(actions);
  } catch (error) {
    console.error('Get admin actions error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

  // ===== PREMIUM ROUTES =====

  app.delete("/api/admin/user/:userId/premium", async (req, res) => {
    try {
      const authResult = await authenticateAdmin(req);
      if ('error' in authResult) {
        return res.status(authResult.status).json({ error: authResult.error });
      }

      const userId = req.params.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Сбрасываем премиум статус
      const updatedUser = await storage.updateUser(userId, {
        premiumTier: 'none',
        premiumEndDate: new Date(),
        premiumSource: null,
        premiumGiftedBy: null,
      });

      // Логируем действие админа
      await storage.createAdminAction({
        adminId: authResult.adminId,
        action: 'revoke_premium',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ reason: 'Admin revocation' })
      });

      res.json({ message: "Premium status revoked successfully" });

    } catch (error) {
      console.error('Revoke premium error:', error);
      res.status(500).json({ error: "Failed to revoke premium" });
    }
  });

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

    // Check if user has active premium
    const hasPremium = user.premiumTier && 
                       user.premiumTier !== 'none' && 
                       user.premiumEndDate && 
                       new Date(user.premiumEndDate) > new Date();

    // Calculate premium bonus (10% if premium is active)
    const premiumBonus = hasPremium ? Math.round(amount * 0.1) : 0;
    const finalAmount = amount + premiumBonus;

    const withdrawalRequest = await storage.createWithdrawalRequest({
      userId: req.params.id,
      amount,
      method,
      methodData: JSON.stringify({
        ...methodData,
        premiumBonus,
        finalAmount,
        hasPremium
      }),
      status: 'pending'
    });

    // Deduct only the base amount from balance (not the bonus)
    await storage.updateUserBalance(
      req.params.id, 
      -amount, 
      `Withdrawal request #${withdrawalRequest.id}${hasPremium ? ` (Premium +${premiumBonus} ₽)` : ''}`,
      'withdrawal_request',
      'withdrawal',
      withdrawalRequest.id
    );

    res.json({
      ...withdrawalRequest,
      premiumBonus,
      finalAmount,
      methodData: {
        ...methodData,
        premiumBonus,
        finalAmount,
        hasPremium
      }
    });
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
    
    const requestsWithParsedData = requests.map(request => {
      const parsedMethodData = JSON.parse(request.methodData);
      return {
        ...request,
        methodData: parsedMethodData,
        premiumBonus: parsedMethodData.premiumBonus || 0,
        finalAmount: parsedMethodData.finalAmount || request.amount
      };
    });
    
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
        const parsedMethodData = JSON.parse(request.methodData);
        
        return {
          ...request,
          methodData: parsedMethodData,
          premiumBonus: parsedMethodData.premiumBonus || 0,
          finalAmount: parsedMethodData.finalAmount || request.amount,
          user: user ? {
            username: user.username,
            displayName: user.displayName,
            telegramUsername: user.telegramUsername,
            premiumTier: user.premiumTier,
            premiumEndDate: user.premiumEndDate
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



  app.post("/api/user/:id/check-discord-premium", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Пользователь может проверить только себя, админ - любого
    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    await discordPremiumService.updateUserPremiumFromDiscord(req.params.id);

    const updatedUser = await storage.getUser(req.params.id);
    
    res.json({
      success: true,
      premiumActive: updatedUser?.premiumTier !== 'none',
      premiumTier: updatedUser?.premiumTier,
      premiumEndDate: updatedUser?.premiumEndDate,
      discordPremiumActive: updatedUser?.discordPremiumActive
    });
  } catch (error) {
    console.error('Check Discord premium error:', error);
    res.status(500).json({ error: "Failed to check Discord premium" });
  }
});

// Admin: Force check all Discord users
app.post("/api/admin/check-all-discord-premium", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Запускаем проверку асинхронно
    discordPremiumService.checkAllDiscordUsers().catch(console.error);

    res.json({
      success: true,
      message: "Discord premium check started"
    });
  } catch (error) {
    console.error('Admin check Discord premium error:', error);
    res.status(500).json({ error: "Failed to start Discord premium check" });
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
          console.log(`🔍 Checking registration for user ${authResult.userId} in tournament ${tournament.id}:`, {
            found: !!registration,
            registrationId: registration?.id,
            teamId: registration?.teamId
          });
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

// Get tournament teams with members
app.get("/api/tournament/:id/teams", async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // Get all teams for this tournament with their members
    const teams = await db
      .select({
        id: tournamentTeams.id,
        name: tournamentTeams.name,
        leaderId: tournamentTeams.leaderId,
        status: tournamentTeams.status,
      })
      .from(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, tournamentId));

    // For each team, get the leader info and members
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        // Get leader info
        const [leader] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.id, team.leaderId));

        // Get all team members (both accepted and pending)
        const members = await db
          .select({
            id: tournamentTeamMembers.id,
            userId: tournamentTeamMembers.userId,
            status: tournamentTeamMembers.status,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
            },
          })
          .from(tournamentTeamMembers)
          .innerJoin(users, eq(tournamentTeamMembers.userId, users.id))
          .where(eq(tournamentTeamMembers.teamId, team.id));

        return {
          id: team.id,
          name: team.name,
          leaderId: team.leaderId,
          leader,
          members,
        };
      })
    );

    // Filter out teams with no members (edge case after deletion)
    const activeTeams = teamsWithMembers.filter(team => team.members.length > 0);

    console.log(`📊 Tournament ${tournamentId}: Total teams: ${teamsWithMembers.length}, Active teams (with members): ${activeTeams.length}`);

    res.json(activeTeams);
  } catch (error) {
    console.error('Get tournament teams error:', error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Check Discord status for tournament participant
app.get("/api/tournament/:id/discord-status", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { user } = authResult;
    const tournamentId = req.params.id;

    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if user has Discord linked
    const hasDiscord = !!user.discordId;

    // Check if user has tournament role (only if Discord is linked and tournament has role)
    let hasRole = false;
    if (hasDiscord && user.discordId && tournament.discordRoleId) {
      try {
        hasRole = await discordTournamentService.hasRole(
          user.discordId,
          tournament.discordRoleId
        );
      } catch (error) {
        console.error('Failed to check Discord role:', error);
        // Don't fail the request if role check fails
      }
    }

    res.json({
      hasDiscord,
      hasRole,
      discordUsername: user.discordUsername || null,
      tournamentHasDiscordIntegration: !!tournament.discordRoleId,
    });

  } catch (error) {
    console.error('Discord status check error:', error);
    res.status(500).json({ error: "Failed to check Discord status" });
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
    if (!tournament.registrationOpen) {
      return res.status(400).json({ error: "Registration is closed" });
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

    // For team-based tournaments, automatically create a team with the user as captain
    if (tournament.teamMode !== 'solo') {
      console.log(`🔧 Tournament teamMode: ${tournament.teamMode}, creating team for user ${userId}`);
      try {
        // Generate a unique team name
        const generatedTeamName = teamName || `Team ${crypto.randomBytes(4).toString('hex')}`;
        console.log(`🔧 Generated team name: ${generatedTeamName}`);

        // Create the team
        const [team] = await db.insert(tournamentTeams).values({
          tournamentId,
          name: generatedTeamName,
          leaderId: userId,
          status: 'registered',
        }).returning();

        console.log(`🔧 Team created with ID: ${team.id}`);

        // Add the captain as the first member
        await db.insert(tournamentTeamMembers).values({
          teamId: team.id,
          userId,
          status: 'accepted',
          joinedAt: new Date(),
        });

        console.log(`✅ Team ${team.id} created for user ${userId} in tournament ${tournamentId}`);

        // Auto-import team captain to linked dropmap
        try {
          const linkedDropmaps = await db
            .select()
            .from(dropMapSettings)
            .where(eq(dropMapSettings.tournamentId, tournamentId));

          for (const dropmap of linkedDropmaps) {
            // Check if captain is already in eligible players
            const [existing] = await db
              .select()
              .from(dropMapEligiblePlayers)
              .where(and(
                eq(dropMapEligiblePlayers.settingsId, dropmap.id),
                eq(dropMapEligiblePlayers.userId, userId)
              ))
              .limit(1);

            if (!existing) {
              await db.insert(dropMapEligiblePlayers).values({
                settingsId: dropmap.id,
                userId,
                displayName: user.displayName,
                sourceType: 'tournament_registration',
                addedBy: null,
              });
              console.log(`✅ Captain ${userId} auto-added to dropmap ${dropmap.id}`);
            } else {
              console.log(`ℹ️ Captain ${userId} already in dropmap ${dropmap.id}`);
            }
          }
        } catch (dropmapError) {
          console.error('❌ Failed to add captain to dropmap:', dropmapError);
          // Don't fail registration if dropmap import fails
        }
      } catch (teamError) {
        console.error('❌ Failed to create team:', teamError);
        // Don't fail registration if team creation fails
      }
    } else {
      console.log(`ℹ️ Tournament is solo mode, skipping team creation`);
    }

    // Increment participant count
    await storage.incrementTournamentParticipants(tournamentId);

    // Auto-close registration if max participants reached
    const updatedTournament = await storage.getTournament(tournamentId);
    if (updatedTournament &&
        updatedTournament.maxParticipants &&
        updatedTournament.currentParticipants >= updatedTournament.maxParticipants) {
      await storage.updateTournament(tournamentId, { registrationOpen: false });
      console.log(`🔒 Registration auto-closed for tournament ${tournamentId} (max participants reached)`);
    }

    // Discord Integration: Assign tournament role if Discord is linked
    if (user.discordId && tournament.discordRoleId) {
      try {
        await discordTournamentService.assignTournamentRole(
          user.discordId,
          tournament.discordRoleId
        );
        console.log(`✅ Discord role ${tournament.discordRoleId} assigned to user ${userId}`);
      } catch (discordError) {
        console.error('Failed to assign Discord role:', discordError);
        // Don't fail registration if Discord role assignment fails
      }
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

    // Always check if user is a team leader in this tournament
    const userTeams = await db
      .select()
      .from(tournamentTeams)
      .where(and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentTeams.leaderId, userId)
      ));

    console.log(`🔍 Found ${userTeams.length} team(s) where user ${userId} is leader:`, userTeams.map(t => t.id));

    if (userTeams.length > 0) {
      // User is a team leader - delete all their teams (should be only 1)
      for (const team of userTeams) {
        console.log(`🗑️  Deleting team ${team.id} and all its members (cascade)...`);
        await db
          .delete(tournamentTeams)
          .where(eq(tournamentTeams.id, team.id));
        console.log(`✅ Team ${team.id} deleted successfully`);
      }
    } else {
      // User is not a leader, check if they're a team member
      const teamMemberships = await db
        .select()
        .from(tournamentTeamMembers)
        .innerJoin(tournamentTeams, eq(tournamentTeamMembers.teamId, tournamentTeams.id))
        .where(and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeamMembers.userId, userId)
        ));

      console.log(`🔍 Found ${teamMemberships.length} team membership(s) for user ${userId}`);

      if (teamMemberships.length > 0) {
        // Remove user from all teams they're a member of
        for (const membership of teamMemberships) {
          await db
            .delete(tournamentTeamMembers)
            .where(and(
              eq(tournamentTeamMembers.teamId, membership.tournament_teams.id),
              eq(tournamentTeamMembers.userId, userId)
            ));
          console.log(`🗑️  Removed user ${userId} from team ${membership.tournament_teams.id}`);
        }
      }
    }

    // Verify team was actually deleted
    const remainingTeams = await db
      .select()
      .from(tournamentTeams)
      .where(and(
        eq(tournamentTeams.tournamentId, tournamentId),
        eq(tournamentTeams.leaderId, userId)
      ));
    console.log(`🔍 After deletion, found ${remainingTeams.length} team(s) for user ${userId}`);

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
    console.log(`🗑️  Attempting to delete registration ${registration.id} for user ${userId}`);
    await storage.cancelTournamentRegistration(registration.id);
    console.log(`✅ Registration ${registration.id} deleted from database`);

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

// ===== TOURNAMENT TEAM ROUTES =====

// Create a team for a tournament
app.post("/api/tournament/:tournamentId/team", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { tournamentId } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Team name is required" });
    }

    // Verify tournament exists and is team-based
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (tournament.teamMode === 'solo') {
      return res.status(400).json({ error: "This tournament is solo mode, teams are not allowed" });
    }

    // Check if user is already registered for this tournament
    const existingRegistration = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, authResult.userId)
        )
      );

    if (existingRegistration.length > 0) {
      return res.status(400).json({ error: "You are already registered for this tournament" });
    }

    // Check if user is already in a team for this tournament
    const existingTeamMembership = await db
      .select({ teamId: tournamentTeams.id })
      .from(tournamentTeams)
      .innerJoin(
        tournamentTeamMembers,
        eq(tournamentTeamMembers.teamId, tournamentTeams.id)
      )
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeamMembers.userId, authResult.userId),
          eq(tournamentTeamMembers.status, 'accepted')
        )
      );

    if (existingTeamMembership.length > 0) {
      return res.status(400).json({ error: "You are already in a team for this tournament" });
    }

    // Create the team
    const [newTeam] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId,
        name: name.trim(),
        leaderId: authResult.userId,
        status: 'registered',
      })
      .returning();

    // Add leader as a team member
    await db.insert(tournamentTeamMembers).values({
      teamId: newTeam.id,
      userId: authResult.userId,
      status: 'accepted',
    });

    res.json(newTeam);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// Get teams for a tournament
app.get("/api/tournament/:tournamentId/teams", async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const teams = await db
      .select({
        id: tournamentTeams.id,
        name: tournamentTeams.name,
        leaderId: tournamentTeams.leaderId,
        status: tournamentTeams.status,
        createdAt: tournamentTeams.createdAt,
        leader: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(tournamentTeams)
      .innerJoin(users, eq(users.id, tournamentTeams.leaderId))
      .where(eq(tournamentTeams.tournamentId, tournamentId));

    // Get members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await db
          .select({
            id: tournamentTeamMembers.id,
            userId: tournamentTeamMembers.userId,
            status: tournamentTeamMembers.status,
            joinedAt: tournamentTeamMembers.joinedAt,
            user: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
            },
          })
          .from(tournamentTeamMembers)
          .innerJoin(users, eq(users.id, tournamentTeamMembers.userId))
          .where(eq(tournamentTeamMembers.teamId, team.id));

        return {
          ...team,
          members,
          memberCount: members.filter(m => m.status === 'accepted').length,
        };
      })
    );

    res.json(teamsWithMembers);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Get user's team for a tournament
app.get("/api/tournament/:tournamentId/my-team", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { tournamentId } = req.params;
    console.log(`🔍 Loading team for user ${authResult.userId} in tournament ${tournamentId}`);

    const teamMembership = await db
      .select({
        teamId: tournamentTeams.id,
        teamName: tournamentTeams.name,
        leaderId: tournamentTeams.leaderId,
        status: tournamentTeams.status,
        memberStatus: tournamentTeamMembers.status,
      })
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeams.id, tournamentTeamMembers.teamId))
      .where(
        and(
          eq(tournamentTeams.tournamentId, tournamentId),
          eq(tournamentTeamMembers.userId, authResult.userId)
        )
      );

    console.log(`🔍 Found ${teamMembership.length} team membership(s)`);

    if (teamMembership.length === 0) {
      console.log(`ℹ️ No team found for user ${authResult.userId}`);
      return res.json(null);
    }

    const team = teamMembership[0];

    // Get all team members
    const members = await db
      .select({
        id: tournamentTeamMembers.id,
        userId: tournamentTeamMembers.userId,
        status: tournamentTeamMembers.status,
        joinedAt: tournamentTeamMembers.joinedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(tournamentTeamMembers)
      .innerJoin(users, eq(users.id, tournamentTeamMembers.userId))
      .where(eq(tournamentTeamMembers.teamId, team.teamId));

    res.json({
      id: team.teamId,
      name: team.teamName,
      leaderId: team.leaderId,
      status: team.status,
      members,
      isLeader: team.leaderId === authResult.userId,
    });
  } catch (error) {
    console.error('Get my team error:', error);
    res.status(500).json({ error: "Failed to fetch your team" });
  }
});

// Invite user to team
app.post("/api/tournament/team/:teamId/invite", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify team exists
    const [team] = await db
      .select()
      .from(tournamentTeams)
      .where(eq(tournamentTeams.id, teamId));

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Only team leader can invite
    if (team.leaderId !== authResult.userId) {
      return res.status(403).json({ error: "Only team leader can invite members" });
    }

    // Get tournament to check team size limits
    const tournament = await storage.getTournament(team.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const maxTeamSize = { solo: 1, duo: 2, trio: 3, squad: 4 }[tournament.teamMode];

    // Check current team size (including pending invites)
    const currentMembers = await db
      .select()
      .from(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.teamId, teamId));

    if (currentMembers.length >= maxTeamSize) {
      return res.status(400).json({ error: `Team is full (max ${maxTeamSize} members)` });
    }

    // Check if user is already in a team or invited
    const existingMembership = await db
      .select()
      .from(tournamentTeamMembers)
      .innerJoin(tournamentTeams, eq(tournamentTeams.id, tournamentTeamMembers.teamId))
      .where(
        and(
          eq(tournamentTeams.tournamentId, team.tournamentId),
          eq(tournamentTeamMembers.userId, userId)
        )
      );

    if (existingMembership.length > 0) {
      return res.status(400).json({ error: "User is already in a team for this tournament" });
    }

    // Check for existing pending invite
    const existingInvite = await db
      .select()
      .from(tournamentTeamInvites)
      .where(
        and(
          eq(tournamentTeamInvites.teamId, teamId),
          eq(tournamentTeamInvites.toUserId, userId),
          eq(tournamentTeamInvites.status, 'pending')
        )
      );

    if (existingInvite.length > 0) {
      return res.status(400).json({ error: "Приглашение уже отправлено этому игроку" });
    }

    // Delete old non-pending invites for this user and team (both accepted and declined)
    await db
      .delete(tournamentTeamInvites)
      .where(
        and(
          eq(tournamentTeamInvites.teamId, teamId),
          eq(tournamentTeamInvites.toUserId, userId),
          sql`${tournamentTeamInvites.status} != 'pending'`
        )
      );

    // Create invite
    const [invite] = await db
      .insert(tournamentTeamInvites)
      .values({
        teamId,
        tournamentId: team.tournamentId,
        fromUserId: authResult.userId,
        toUserId: userId,
        status: 'pending',
      })
      .returning();

    // Create a pending team member slot (reserves the slot immediately)
    await db
      .insert(tournamentTeamMembers)
      .values({
        teamId,
        userId,
        status: 'pending', // Shows as "Ожидает подтверждения"
      });

    console.log(`✉️  Created pending team member slot for user ${userId} in team ${teamId}`);

    res.json(invite);
  } catch (error) {
    console.error('Invite to team error:', error);
    res.status(500).json({ error: "Failed to send invite" });
  }
});

// Get user's pending invites
app.get("/api/tournament/team/invites", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const invitesData = await db
      .select({
        id: tournamentTeamInvites.id,
        teamId: tournamentTeamInvites.teamId,
        tournamentId: tournamentTeamInvites.tournamentId,
        fromUserId: tournamentTeamInvites.fromUserId,
        status: tournamentTeamInvites.status,
        createdAt: tournamentTeamInvites.createdAt,
        teamName: tournamentTeams.name,
        tournamentName: tournaments.name,
        tournamentTeamMode: tournaments.teamMode,
      })
      .from(tournamentTeamInvites)
      .innerJoin(tournamentTeams, eq(tournamentTeams.id, tournamentTeamInvites.teamId))
      .innerJoin(tournaments, eq(tournaments.id, tournamentTeamInvites.tournamentId))
      .where(
        and(
          eq(tournamentTeamInvites.toUserId, authResult.userId),
          eq(tournamentTeamInvites.status, 'pending')
        )
      );

    // Fetch user details for each invite
    const invites = await Promise.all(
      invitesData.map(async (invite) => {
        const [fromUser] = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.id, invite.fromUserId));

        return {
          id: invite.id,
          teamId: invite.teamId,
          tournamentId: invite.tournamentId,
          status: invite.status,
          createdAt: invite.createdAt,
          team: {
            id: invite.teamId,
            name: invite.teamName,
          },
          fromUser,
          tournament: {
            id: invite.tournamentId,
            name: invite.tournamentName,
            teamMode: invite.tournamentTeamMode,
          },
        };
      })
    );

    res.json(invites);
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

// Respond to team invite (accept/decline)
app.post("/api/tournament/team/invite/:inviteId/respond", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { inviteId } = req.params;
    const { accept } = req.body;

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: "Accept parameter must be a boolean" });
    }

    // Get invite
    const [invite] = await db
      .select()
      .from(tournamentTeamInvites)
      .where(eq(tournamentTeamInvites.id, inviteId));

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.toUserId !== authResult.userId) {
      return res.status(403).json({ error: "This invite is not for you" });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: "This invite has already been responded to" });
    }

    if (accept) {
      // Get team and tournament info
      const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, invite.teamId));
      const tournament = await storage.getTournament(invite.tournamentId);

      if (!team || !tournament) {
        return res.status(404).json({ error: "Team or tournament not found" });
      }

      const maxTeamSize = { solo: 1, duo: 2, trio: 3, squad: 4 }[tournament.teamMode];

      // Check team isn't full (count only accepted members)
      const currentMembers = await db
        .select()
        .from(tournamentTeamMembers)
        .where(
          and(
            eq(tournamentTeamMembers.teamId, invite.teamId),
            eq(tournamentTeamMembers.status, 'accepted')
          )
        );

      if (currentMembers.length >= maxTeamSize) {
        return res.status(400).json({ error: "Team is now full" });
      }

      // Update existing pending member slot to accepted
      await db
        .update(tournamentTeamMembers)
        .set({ status: 'accepted' })
        .where(
          and(
            eq(tournamentTeamMembers.teamId, invite.teamId),
            eq(tournamentTeamMembers.userId, authResult.userId),
            eq(tournamentTeamMembers.status, 'pending')
          )
        );

      console.log(`✅ User ${authResult.userId} accepted invite and joined team ${invite.teamId}`);

      // Charge entry fee if applicable
      if (tournament.entryFee > 0) {
        const user = authResult.user;
        if (user.balance < tournament.entryFee) {
          // Rollback - remove from team
          await db
            .delete(tournamentTeamMembers)
            .where(
              and(
                eq(tournamentTeamMembers.teamId, invite.teamId),
                eq(tournamentTeamMembers.userId, authResult.userId)
              )
            );

          return res.status(400).json({ error: "Insufficient balance to join team" });
        }

        // Deduct entry fee
        await db
          .update(users)
          .set({ balance: sql`${users.balance} - ${tournament.entryFee}` })
          .where(eq(users.id, authResult.userId));

        // Record transaction
        await db.insert(balanceTransactions).values({
          userId: authResult.userId,
          type: 'tournament_entry',
          amount: -tournament.entryFee,
          description: `Entry fee for joining team "${team.name}" in tournament "${tournament.name}"`,
          sourceType: 'tournament_team',
          sourceId: invite.teamId,
        });
      }

      // Update invite status
      await db
        .update(tournamentTeamInvites)
        .set({ status: 'accepted', respondedAt: new Date() })
        .where(eq(tournamentTeamInvites.id, inviteId));

      // Discord Integration: Assign tournament role if Discord is linked
      const user = authResult.user;
      if (user.discordId && tournament.discordRoleId) {
        try {
          await discordTournamentService.assignTournamentRole(
            user.discordId,
            tournament.discordRoleId
          );
          console.log(`✅ Discord role assigned to user ${user.id} for tournament ${tournament.id} (joined team)`);
        } catch (discordError) {
          console.error('Failed to assign Discord role on team join:', discordError);
          // Don't fail the team join if Discord role assignment fails
        }
      }

      res.json({ message: "Successfully joined team", teamId: invite.teamId });
    } else {
      // Decline invite - remove pending member slot
      await db
        .delete(tournamentTeamMembers)
        .where(
          and(
            eq(tournamentTeamMembers.teamId, invite.teamId),
            eq(tournamentTeamMembers.userId, authResult.userId),
            eq(tournamentTeamMembers.status, 'pending')
          )
        );

      await db
        .update(tournamentTeamInvites)
        .set({ status: 'declined', respondedAt: new Date() })
        .where(eq(tournamentTeamInvites.id, inviteId));

      console.log(`❌ User ${authResult.userId} declined invite to team ${invite.teamId}`);

      res.json({ message: "Invite declined" });
    }
  } catch (error) {
    console.error('Respond to invite error:', error);
    res.status(500).json({ error: "Failed to respond to invite" });
  }
});

// Leave team endpoint
app.post("/api/tournament/team/:teamId/leave", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { teamId } = req.params;

    // Get team
    const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Cannot leave if you're the leader
    if (team.leaderId === authResult.userId) {
      return res.status(400).json({ error: "Team leader cannot leave the team. Disband the team instead." });
    }

    // Check if user is in the team
    const [membership] = await db
      .select()
      .from(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, authResult.userId)
        )
      );

    if (!membership) {
      return res.status(404).json({ error: "You are not in this team" });
    }

    // Remove from team
    await db
      .delete(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, authResult.userId)
        )
      );

    // Get tournament for refund
    const tournament = await storage.getTournament(team.tournamentId);
    if (tournament && tournament.entryFee > 0) {
      // Refund entry fee
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${tournament.entryFee}` })
        .where(eq(users.id, authResult.userId));

      // Record transaction
      await db.insert(balanceTransactions).values({
        userId: authResult.userId,
        type: 'refund',
        amount: tournament.entryFee,
        description: `Refund for leaving team "${team.name}"`,
        sourceType: 'tournament_team',
        sourceId: teamId,
      });
    }

    res.json({ message: "Successfully left the team" });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: "Failed to leave team" });
  }
});

// Kick player from team endpoint
app.post("/api/tournament/team/:teamId/kick", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get team
    const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Only leader can kick
    if (team.leaderId !== authResult.userId) {
      return res.status(403).json({ error: "Only team leader can kick members" });
    }

    // Cannot kick yourself
    if (userId === authResult.userId) {
      return res.status(400).json({ error: "Cannot kick yourself" });
    }

    // Check if user is in the team
    const [membership] = await db
      .select()
      .from(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, userId)
        )
      );

    if (!membership) {
      return res.status(404).json({ error: "User is not in this team" });
    }

    // Remove from team
    await db
      .delete(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, userId)
        )
      );

    // Get tournament for refund
    const tournament = await storage.getTournament(team.tournamentId);
    if (tournament && tournament.entryFee > 0) {
      // Refund entry fee
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${tournament.entryFee}` })
        .where(eq(users.id, userId));

      // Record transaction
      await db.insert(balanceTransactions).values({
        userId: userId,
        type: 'refund',
        amount: tournament.entryFee,
        description: `Refund for being kicked from team "${team.name}"`,
        sourceType: 'tournament_team',
        sourceId: teamId,
      });
    }

    res.json({ message: "Player kicked successfully" });
  } catch (error) {
    console.error('Kick player error:', error);
    res.status(500).json({ error: "Failed to kick player" });
  }
});

// Cancel team invite (remove pending member)
app.post("/api/tournament/team/:teamId/cancel-invite", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get team
    const [team] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, teamId));
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Only leader can cancel invites
    if (team.leaderId !== authResult.userId) {
      return res.status(403).json({ error: "Only team leader can cancel invites" });
    }

    // Check if user has pending invitation
    const [membership] = await db
      .select()
      .from(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, userId),
          eq(tournamentTeamMembers.status, 'pending')
        )
      );

    if (!membership) {
      return res.status(404).json({ error: "No pending invitation found for this user" });
    }

    // Delete pending member and invitation
    await db
      .delete(tournamentTeamMembers)
      .where(
        and(
          eq(tournamentTeamMembers.teamId, teamId),
          eq(tournamentTeamMembers.userId, userId),
          eq(tournamentTeamMembers.status, 'pending')
        )
      );

    // Also delete the invite record
    await db
      .delete(tournamentTeamInvites)
      .where(
        and(
          eq(tournamentTeamInvites.teamId, teamId),
          eq(tournamentTeamInvites.toUserId, userId),
          eq(tournamentTeamInvites.status, 'pending')
        )
      );

    console.log(`✅ Team leader ${authResult.userId} cancelled invite for user ${userId} in team ${teamId}`);

    res.json({ message: "Invite cancelled successfully" });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({ error: "Failed to cancel invite" });
  }
});

// ===== ADMIN TOURNAMENT ROUTES =====

app.post("/api/admin/tournament", upload.single('image'), async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    let imageUrl = null;
    let cloudinaryPublicId = null;

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

    // Parse prize distribution from form data
    let prizeDistribution = null;
    if (req.body.prizeDistribution) {
      try {
        const parsed = typeof req.body.prizeDistribution === 'string' 
          ? JSON.parse(req.body.prizeDistribution)
          : req.body.prizeDistribution;
        
        // Validate that all values are positive numbers
        const isValid = Object.entries(parsed).every(([place, amount]) => {
          return !isNaN(parseInt(place)) && 
                 !isNaN(parseFloat(amount as string)) && 
                 parseFloat(amount as string) > 0;
        });

        if (isValid) {
          prizeDistribution = parsed;
        }
      } catch (error) {
        console.error('Failed to parse prize distribution:', error);
      }
    }

    // Calculate total prize from distribution or use provided prize
    const totalPrize = prizeDistribution 
      ? Object.values(prizeDistribution).reduce((sum: number, amount) => sum + parseFloat(amount as string), 0)
      : parseInt(req.body.prize) || 0;

    const autoCreateDiscordChannels = req.body.autoCreateDiscordChannels === 'true' || req.body.autoCreateDiscordChannels === true;
    const discordRoleId = req.body.discordRoleId || null;

    const tournamentData = {
      ...req.body,
      prize: totalPrize,
      prizeDistribution,
      entryFee: parseInt(req.body.entryFee) || 0,
      maxParticipants: req.body.maxParticipants ? parseInt(req.body.maxParticipants) : null,
      imageUrl,
      cloudinaryPublicId,
      createdBy: authResult.adminId,
      autoCreateDiscordChannels,
      discordRoleId,
    };

    const validation = insertTournamentSchema.safeParse(tournamentData);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid tournament data",
        details: validation.error.errors
      });
    }

    const tournament = await storage.createTournament(validation.data);

    // DropMap Integration: Create map for tournament
    let dropMap = null;
    try {
      console.log(`🗺️  Creating dropmap for tournament: ${tournament.name}`);
      dropMap = await territoryStorage.createEmptyMap(
        `${tournament.name} - Карта`,
        `Карта для турнира: ${tournament.name}`,
        tournament.imageUrl || undefined,
        authResult.adminId,
        tournament.id,
        tournament.teamMode
      );

      // Link dropmap to tournament
      await storage.updateTournament(tournament.id, {
        dropMapId: dropMap.id
      });

      console.log(`✅ DropMap created: ${dropMap.id} for tournament ${tournament.id}`);
    } catch (dropMapError) {
      console.error('DropMap creation error:', dropMapError);
      // Tournament created but dropmap failed - continue anyway
    }

    // Discord Integration: Create role and channels if requested
    if (autoCreateDiscordChannels) {
      try {
        console.log(`🔄 Creating Discord role and channels for tournament: ${tournament.name}`);

        // Create Discord role
        const roleId = await discordTournamentService.createTournamentRole(tournament.name);

        // Create Discord channels
        const channels = await discordTournamentService.createTournamentChannels(
          tournament.name,
          roleId
        );

        // Update tournament with Discord IDs
        await storage.updateTournament(tournament.id, {
          discordRoleId: roleId,
          discordCategoryId: channels.categoryId,
          discordInfoChannelId: channels.infoChannelId,
          discordChatChannelId: channels.chatChannelId,
          discordPasswordChannelId: channels.passwordChannelId,
          discordMapChannelId: channels.mapChannelId,
        });

        // Post tournament info to info channel
        await discordTournamentService.postTournamentInfo(
          channels.infoChannelId,
          {
            ...tournament,
            discordRoleId: roleId,
            discordCategoryId: channels.categoryId,
            discordInfoChannelId: channels.infoChannelId,
            discordChatChannelId: channels.chatChannelId,
            discordPasswordChannelId: channels.passwordChannelId,
          }
        );

        console.log(`✅ Discord integration complete for tournament: ${tournament.id}`);

        // Return updated tournament data
        const updatedTournament = await storage.getTournamentById(tournament.id);
        await storage.createAdminAction({
          adminId: authResult.adminId,
          action: 'create_tournament',
          targetType: 'tournament',
          targetId: tournament.id,
          details: JSON.stringify({
            name: tournament.name,
            prize: tournament.prize,
            prizeDistribution: tournament.prizeDistribution,
            entryFee: tournament.entryFee,
            discordIntegration: true,
            roleId,
          })
        });

        console.log(`✅ Tournament created: ${tournament.id} by admin ${authResult.adminId}`);
        return res.json(updatedTournament);

      } catch (discordError) {
        console.error('Discord integration error:', discordError);
        // Tournament created but Discord integration failed
        // Return tournament anyway but log the error
        await storage.createAdminAction({
          adminId: authResult.adminId,
          action: 'create_tournament',
          targetType: 'tournament',
          targetId: tournament.id,
          details: JSON.stringify({
            name: tournament.name,
            prize: tournament.prize,
            discordIntegrationError: (discordError as Error).message,
          })
        });

        console.log(`⚠️ Tournament created: ${tournament.id} but Discord integration failed`);
        return res.json(tournament);
      }
    }

    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'create_tournament',
      targetType: 'tournament',
      targetId: tournament.id,
      details: JSON.stringify({
        name: tournament.name,
        prize: tournament.prize,
        prizeDistribution: tournament.prizeDistribution,
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

// ===== DEV LOGIN (ONLY IN DEVELOPMENT) =====

if (process.env.NODE_ENV === 'development') {
  app.post("/api/auth/dev-login", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username?.trim()) {
        return res.status(400).json({ error: "Username is required" });
      }

      // Проверяем или создаем тестового пользователя
      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Создаем нового тестового пользователя
        const isAdmin = username.toLowerCase().includes('admin');
        
        user = await storage.createUser({
          username: username,
          displayName: `Test ${username}`,
          email: `${username}@test.local`,
          epicGamesId: `dev-${username}-${Date.now()}`,
          balance: isAdmin ? 10000 : 1000, // Админы получают больше денег для тестов
          isAdmin: isAdmin,
        });

        console.log(`✅ Created dev user: ${username} (admin: ${isAdmin})`);
      } else {
        console.log(`🔄 Using existing dev user: ${username}`);
      }
      
      // Создаем токен
      const token = generateSessionToken(user);
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          balance: user.balance,
          isAdmin: user.isAdmin,
          subscriptionScreenshotStatus: user.subscriptionScreenshotStatus,
          premiumTier: user.premiumTier,
          premiumEndDate: user.premiumEndDate,
        },
        token 
      });
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({ error: "Failed to create dev user" });
    }
  });

  console.log('🔧 Dev login endpoint enabled at /api/auth/dev-login');
}

app.post("/api/admin/submission/:id/review", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Парсим reward правильно - может быть 0, число или undefined
    let parsedReward: number | undefined = undefined;
    if (req.body.reward !== undefined && req.body.reward !== null && req.body.reward !== '') {
      const rewardNum = Number(req.body.reward);
      if (!isNaN(rewardNum)) {
        parsedReward = rewardNum;
      }
    }

    const reviewData = {
      status: req.body.status,
      reward: parsedReward,
      rejectionReason: req.body.rejectionReason
    };

    console.log('📝 Review data:', {
      status: reviewData.status,
      reward: reviewData.reward,
      rawReward: req.body.reward,
      rejectionReason: reviewData.rejectionReason
    });

    const validation = reviewSubmissionSchema.safeParse(reviewData);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return res.status(400).json({ 
        error: "Invalid review data", 
        details: validation.error.errors 
      });
    }

    const { status, reward, rejectionReason } = validation.data;
    
    if (status === 'approved' && reward === undefined) {
      return res.status(400).json({ error: "Reward amount required for approved submissions" });
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

    if (status === 'approved' && reward !== undefined) {
      // Выдаем баланс
      await storage.updateUserBalance(submission.userId, reward);
      
      // 🆕 ВЫДАЕМ КИЛЛ ЕСЛИ ЭТО KILL-КАТЕГОРИЯ
      const killType = getKillTypeFromCategory(submission.category);
      if (killType) {
        try {
          await storage.addKillToUser(
            submission.userId,
            killType,
            reward,
            submission.id,
            authResult.adminId,
            `Approved ${submission.category} submission`,
            {
              category: submission.category,
              filename: submission.originalFilename,
              adminUsername: authResult.admin.username
            }
          );
          
          console.log(`✅ ${killType.toUpperCase()} kill granted to user ${submission.userId} for submission ${submission.id}`);
        } catch (killError) {
          console.error('Error granting kill:', killError);
          // Не прерываем процесс если не удалось выдать килл
        }
      }
      
      await storage.createAdminAction({
        adminId: authResult.adminId,
        action: 'approve_submission',
        targetType: 'submission',
        targetId: submission.id,
        details: JSON.stringify({ 
          reward, 
          submissionId: submission.id,
          killType: killType || 'none'
        })
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

// 🆕 НОВЫЙ РОУТ: ПОЛУЧИТЬ ИСТОРИЮ КИЛЛОВ ПОЛЬЗОВАТЕЛЯ
app.get("/api/user/:id/kills", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Пользователи могут смотреть только свою историю, админы - любую
    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const killHistory = await storage.getUserKillHistory(req.params.id, limit);
    
    res.json(killHistory);
  } catch (error) {
    console.error('Get kill history error:', error);
    res.status(500).json({ error: "Failed to fetch kill history" });
  }
});

// 🆕 НОВЫЙ РОУТ: ПОЛУЧИТЬ СТАТИСТИКУ КИЛЛОВ ПОЛЬЗОВАТЕЛЯ
app.get("/api/user/:id/kill-stats", async (req, res) => {
  try {
    const authResult = await authenticateUser(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    if (authResult.userId !== req.params.id && !authResult.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stats = await storage.getUserKillStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Get kill stats error:', error);
    res.status(500).json({ error: "Failed to fetch kill stats" });
  }
});

// 🆕 НОВЫЙ РОУТ: ПОЛУЧИТЬ ВСЮ ИСТОРИЮ КИЛЛОВ (АДМИН)
app.get("/api/admin/kills", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const killHistory = await storage.getAllKillHistory(limit);
    
    res.json(killHistory);
  } catch (error) {
    console.error('Get all kill history error:', error);
    res.status(500).json({ error: "Failed to fetch kill history" });
  }
});
app.patch("/api/admin/tournament/:id", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // Handle prize distribution update
    let updateData = { ...req.body };
    
    if (req.body.prizeDistribution) {
      try {
        const parsed = typeof req.body.prizeDistribution === 'string' 
          ? JSON.parse(req.body.prizeDistribution)
          : req.body.prizeDistribution;
        
        updateData.prizeDistribution = parsed;
        
        // Recalculate total prize if distribution changed
        if (parsed) {
          const totalPrize = Object.values(parsed).reduce(
            (sum: number, amount) => sum + parseFloat(amount as string), 
            0
          );
          updateData.prize = totalPrize;
        }
      } catch (error) {
        console.error('Failed to parse prize distribution:', error);
      }
    }

    const validation = updateTournamentSchema.safeParse(updateData);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid update data", 
        details: validation.error.errors 
      });
    }

    const tournament = await storage.updateTournament(req.params.id, validation.data);

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

// Link existing dropmap to tournament
app.post("/api/admin/tournament/:id/link-dropmap", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { dropMapId } = req.body;
    if (!dropMapId) {
      return res.status(400).json({ error: "dropMapId is required" });
    }

    const tournamentId = req.params.id;

    // Verify tournament exists
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Verify dropmap exists
    const [dropMap] = await db
      .select()
      .from(dropMapSettings)
      .where(eq(dropMapSettings.id, dropMapId))
      .limit(1);

    if (!dropMap) {
      return res.status(404).json({ error: "DropMap not found" });
    }

    // Check if dropmap is already linked to another tournament
    if (dropMap.tournamentId && dropMap.tournamentId !== tournamentId) {
      return res.status(400).json({
        error: "This dropmap is already linked to another tournament"
      });
    }

    // Update tournament with dropMapId
    await storage.updateTournament(tournamentId, { dropMapId });

    // Update dropmap with tournamentId and teamMode
    await db
      .update(dropMapSettings)
      .set({
        tournamentId: tournamentId,
        teamMode: tournament.teamMode,
        mode: 'tournament',
      })
      .where(eq(dropMapSettings.id, dropMapId));

    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'link_dropmap',
      targetType: 'tournament',
      targetId: tournamentId,
      details: JSON.stringify({ dropMapId })
    });

    console.log(`✅ Linked dropmap ${dropMapId} to tournament ${tournamentId}`);
    res.json({ success: true, dropMapId });
  } catch (error) {
    console.error('Link dropmap error:', error);
    res.status(500).json({ error: "Failed to link dropmap" });
  }
});

// Toggle registration open/closed
app.post("/api/admin/tournament/:id/toggle-registration", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const tournamentId = req.params.id;
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const newRegistrationState = !tournament.registrationOpen;
    const updatedTournament = await storage.updateTournament(tournamentId, {
      registrationOpen: newRegistrationState
    });

    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: newRegistrationState ? 'open_tournament_registration' : 'close_tournament_registration',
      targetType: 'tournament',
      targetId: tournamentId,
      details: JSON.stringify({
        registrationOpen: newRegistrationState,
        tournamentName: tournament.name
      })
    });

    console.log(`🔄 Tournament ${tournamentId} registration ${newRegistrationState ? 'opened' : 'closed'} by admin ${authResult.adminId}`);

    res.json({
      message: `Registration ${newRegistrationState ? 'opened' : 'closed'} successfully`,
      tournament: updatedTournament
    });
  } catch (error) {
    console.error('Toggle registration error:', error);
    res.status(500).json({ error: "Failed to toggle registration" });
  }
});

// Distribute prizes according to prize distribution
app.post("/api/admin/tournament/:id/distribute-prizes", async (req, res) => {
  try {
    const authResult = await authenticateAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { placements } = req.body; // { userId: place } mapping
    const tournamentId = req.params.id;

    if (!placements || Object.keys(placements).length === 0) {
      return res.status(400).json({ error: "Placements are required" });
    }

    const tournament = await storage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (!tournament.prizeDistribution) {
      return res.status(400).json({ error: "Tournament has no prize distribution configured" });
    }

    const results = [];

    for (const [userId, place] of Object.entries(placements)) {
      const prizeAmount = tournament.prizeDistribution[place as string];
      
      if (!prizeAmount) {
        console.warn(`No prize configured for place ${place}`);
        continue;
      }

      try {
        await storage.updateUserBalance(
          userId,
          prizeAmount,
          `Приз за ${place}-е место в турнире: ${tournament.name}`,
          'bonus',
          'tournament',
          tournamentId
        );

        results.push({
          userId,
          place: parseInt(place as string),
          amount: prizeAmount,
          success: true
        });

        console.log(`✅ Prize distributed: ${prizeAmount} ₽ to user ${userId} for place ${place}`);
      } catch (error) {
        console.error(`Failed to distribute prize to user ${userId}:`, error);
        results.push({
          userId,
          place: parseInt(place as string),
          amount: prizeAmount,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    await storage.createAdminAction({
      adminId: authResult.adminId,
      action: 'distribute_tournament_prizes',
      targetType: 'tournament',
      targetId: tournamentId,
      details: JSON.stringify({ 
        tournamentName: tournament.name,
        placements,
        results
      })
    });

    const successCount = results.filter(r => r.success).length;
    const totalDistributed = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.amount, 0);

    res.json({
      message: `Призы распределены: ${successCount} из ${results.length}`,
      totalDistributed,
      results
    });

  } catch (error) {
    console.error('Distribute prizes error:', error);
    res.status(500).json({ error: "Failed to distribute prizes" });
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