// server/storage.ts - Complete storage implementation with Telegram verification
import { 
  users, 
  submissions, 
  adminActions,
  balanceTransactions,
  withdrawalRequests,
  tournaments,
  tournamentRegistrations,
  premiumHistory,
  telegramVerifications,
  type User, 
  type InsertUser, 
  type Submission, 
  type InsertSubmission,
  type AdminAction,
  type InsertAdminAction,
  type BalanceTransaction,
  type InsertBalanceTransaction,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
  type Tournament,
  type InsertTournament,
  type TournamentRegistration,
  type InsertTournamentRegistration,
  type TournamentWithDetails,
  type PremiumHistory,
  type InsertPremiumHistory,
  type TelegramVerification,
  type InsertTelegramVerification
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEpicGamesId(epicGamesId: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  getUserByTelegramId(telegramChatId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Discord OAuth
  linkDiscordAccount(userId: string, discordData: {
    discordId: string;
    discordUsername: string;
    discordEmail?: string;
    discordAvatar?: string;
  }): Promise<User>;
  unlinkDiscordAccount(userId: string): Promise<User>;
  
  // Telegram OAuth
  linkTelegramAccount(userId: string, telegramData: {
    telegramChatId: string;
    telegramUsername: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhotoUrl?: string;
  }): Promise<User>;
  unlinkTelegramAccount(userId: string): Promise<User>;
  
  // Telegram verification operations
  createTelegramVerification(data: { 
    userId: string; 
    code: string; 
    expiresAt: Date 
  }): Promise<TelegramVerification>;
  getTelegramVerification(code: string): Promise<TelegramVerification | undefined>;
  deleteTelegramVerification(code: string): Promise<void>;
  cleanupExpiredTelegramVerifications(): Promise<number>;
  
  // Balance operations
  updateUserBalance(
    id: string, 
    deltaAmount: number, 
    description?: string, 
    type?: 'earning' | 'bonus' | 'withdrawal_request' | 'withdrawal_completed', 
    sourceType?: string, 
    sourceId?: string
  ): Promise<User>;
  createBalanceTransaction(transaction: InsertBalanceTransaction): Promise<BalanceTransaction>;
  getUserBalanceTransactions(userId: string, limit?: number): Promise<BalanceTransaction[]>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByUserId(userId: string): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  getAllSubmissionsWithUsers(): Promise<Submission[]>;
  updateSubmissionStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string, 
    reward?: number, 
    rejectionReason?: string
  ): Promise<Submission>;
  
  // Admin operations
  createAdminAction(action: InsertAdminAction | (Omit<InsertAdminAction, 'adminId'> & { adminId: string | 'system' })): Promise<AdminAction>;
  getAdminActions(): Promise<AdminAction[]>;
  getAdminActionsWithUsers(): Promise<AdminAction[]>;

  // Premium operations
  createPremiumHistory(history: InsertPremiumHistory): Promise<PremiumHistory>;
  getPremiumHistory(userId: string): Promise<PremiumHistory[]>;
  getPremiumUsers(): Promise<User[]>;
  expireOldPremiums(): Promise<number>;
  checkPremiumStatus(userId: string): Promise<boolean>;

  // Subscription screenshot operations
  getUsersWithPendingSubscriptionScreenshots(): Promise<User[]>;
  updateUserSubscriptionScreenshot(id: string, updates: {
    subscriptionScreenshotUrl?: string;
    subscriptionScreenshotStatus?: string;
    subscriptionScreenshotUploadedAt?: Date;
    subscriptionScreenshotReviewedAt?: Date;
    subscriptionScreenshotReviewedBy?: string;
    subscriptionScreenshotRejectionReason?: string;
    subscriptionScreenshotCloudinaryPublicId?: string;
  }): Promise<User>;

  // Withdrawal operations
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest>;
  getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined>;
  
  // Tournament operations
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  getActiveTournaments(): Promise<Tournament[]>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;
  incrementTournamentParticipants(id: string): Promise<void>;
  decrementTournamentParticipants(id: string): Promise<void>;
  getTournamentWithDetails(id: string): Promise<TournamentWithDetails | undefined>;

  // Tournament registration operations
  registerForTournament(registration: InsertTournamentRegistration): Promise<TournamentRegistration>;
  getTournamentRegistration(tournamentId: string, userId: string): Promise<TournamentRegistration | undefined>;
  getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]>;
  getUserTournamentRegistrations(userId: string): Promise<TournamentRegistration[]>;
  cancelTournamentRegistration(id: string): Promise<void>;
  
  // Statistics
  getUserStats(userId: string): Promise<{
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
    isAdmin: boolean;
  }>;
}

export class DatabaseStorage implements IStorage {
  // ===== USER OPERATIONS =====
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEpicGamesId(epicGamesId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.epicGamesId, epicGamesId));
    return user || undefined;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user || undefined;
  }

  async getUserByTelegramId(telegramChatId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramChatId, telegramChatId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ===== DISCORD OAUTH OPERATIONS =====
  
  async linkDiscordAccount(userId: string, discordData: {
    discordId: string;
    discordUsername: string;
    discordEmail?: string;
    discordAvatar?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        discordId: discordData.discordId,
        discordUsername: discordData.discordUsername,
        discordEmail: discordData.discordEmail || null,
        discordAvatar: discordData.discordAvatar || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`Discord linked for user ${userId}: ${discordData.discordUsername} (${discordData.discordId})`);
    return user;
  }

  async unlinkDiscordAccount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        discordId: null,
        discordUsername: null,
        discordEmail: null,
        discordAvatar: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`Discord unlinked for user ${userId}`);
    return user;
  }

  // ===== TELEGRAM OAUTH OPERATIONS =====
  
  async linkTelegramAccount(userId: string, telegramData: {
    telegramChatId: string;
    telegramUsername: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhotoUrl?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        telegramChatId: telegramData.telegramChatId,
        telegramUsername: telegramData.telegramUsername,
        telegramFirstName: telegramData.telegramFirstName || null,
        telegramLastName: telegramData.telegramLastName || null,
        telegramPhotoUrl: telegramData.telegramPhotoUrl || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`Telegram linked for user ${userId}: ${telegramData.telegramUsername} (${telegramData.telegramChatId})`);
    return user;
  }

  async unlinkTelegramAccount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        telegramChatId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null,
        telegramPhotoUrl: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`Telegram unlinked for user ${userId}`);
    return user;
  }

  // ===== TELEGRAM VERIFICATION OPERATIONS =====
  
  async createTelegramVerification(data: {
    userId: string;
    code: string;
    expiresAt: Date;
  }): Promise<TelegramVerification> {
    // Delete any existing verifications for this user
    await db
      .delete(telegramVerifications)
      .where(eq(telegramVerifications.userId, data.userId));

    const [verification] = await db
      .insert(telegramVerifications)
      .values(data)
      .returning();
    
    console.log(`Created Telegram verification code ${data.code} for user ${data.userId} (expires: ${data.expiresAt.toISOString()})`);
    return verification;
  }

  async getTelegramVerification(code: string): Promise<TelegramVerification | undefined> {
    const [verification] = await db
      .select()
      .from(telegramVerifications)
      .where(
        and(
          eq(telegramVerifications.code, code.toUpperCase()),
          sql`${telegramVerifications.expiresAt} > NOW()`
        )
      );
    
    if (verification) {
      console.log(`Found valid verification code ${code} for user ${verification.userId}`);
    } else {
      console.log(`Verification code ${code} not found or expired`);
    }
    
    return verification || undefined;
  }

  async deleteTelegramVerification(code: string): Promise<void> {
    const result = await db
      .delete(telegramVerifications)
      .where(eq(telegramVerifications.code, code.toUpperCase()))
      .returning();
    
    if (result.length > 0) {
      console.log(`Deleted Telegram verification code ${code}`);
    }
  }

  async cleanupExpiredTelegramVerifications(): Promise<number> {
    const result = await db
      .delete(telegramVerifications)
      .where(lt(telegramVerifications.expiresAt, new Date()));
    
    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`Cleaned up ${count} expired Telegram verification codes`);
    }
    return count;
  }

  // ===== BALANCE OPERATIONS =====
  
  async createBalanceTransaction(insertTransaction: InsertBalanceTransaction): Promise<BalanceTransaction> {
    const [transaction] = await db
      .insert(balanceTransactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserBalanceTransactions(userId: string, limit: number = 20): Promise<BalanceTransaction[]> {
    return await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.userId, userId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(limit);
  }

  async updateUserBalance(
    id: string, 
    deltaAmount: number, 
    description: string = 'Balance change',
    type: 'earning' | 'bonus' | 'withdrawal_request' | 'withdrawal_completed' = 'bonus',
    sourceType?: string,
    sourceId?: string
  ): Promise<User> {
    const currentUser = await this.getUser(id);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    const newBalance = currentUser.balance + deltaAmount;
    
    const [user] = await db
      .update(users)
      .set({ 
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    await this.createBalanceTransaction({
      userId: id,
      type,
      amount: deltaAmount,
      description,
      sourceType,
      sourceId
    });
    
    return user;
  }

  // ===== PREMIUM OPERATIONS =====

  async createPremiumHistory(insertHistory: InsertPremiumHistory): Promise<PremiumHistory> {
    const [history] = await db
      .insert(premiumHistory)
      .values(insertHistory)
      .returning();
    return history;
  }

  async getPremiumHistory(userId: string): Promise<PremiumHistory[]> {
    return await db
      .select()
      .from(premiumHistory)
      .where(eq(premiumHistory.userId, userId))
      .orderBy(desc(premiumHistory.createdAt));
  }

  async getPremiumUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.premiumTier} != 'none'`)
      .orderBy(users.premiumEndDate);
  }

  async expireOldPremiums(): Promise<number> {
    const now = new Date();
    
    const expiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.premiumTier} != 'none'`,
          sql`${users.premiumEndDate} < ${now}`
        )
      );
    
    if (expiredUsers.length === 0) {
      return 0;
    }
    
    for (const user of expiredUsers) {
      await db
        .update(users)
        .set({
          premiumTier: 'none',
          premiumStartDate: null,
          premiumEndDate: null,
          premiumAutoRenew: false,
          premiumLastChecked: now,
          updatedAt: now
        })
        .where(eq(users.id, user.id));
      
      console.log(`Premium expired for user ${user.username} (${user.id})`);
    }
    
    return expiredUsers.length;
  }

  async checkPremiumStatus(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    if (!user.premiumTier || user.premiumTier === 'none') return false;
    if (!user.premiumEndDate) return false;
    
    const now = new Date();
    const endDate = new Date(user.premiumEndDate);
    
    return endDate > now;
  }

  // ===== WITHDRAWAL OPERATIONS =====
  
  async createWithdrawalRequest(insertRequest: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [request] = await db
      .insert(withdrawalRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined> {
    const [request] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id));
    return request || undefined;
  }

  async updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest> {
    const [request] = await db
      .update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return request;
  }

  // ===== SUBMISSION OPERATIONS =====
  
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db
      .insert(submissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission || undefined;
  }

  async getSubmissionsByUserId(userId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
  }

  async getAllSubmissionsWithUsers(): Promise<Submission[]> {
    const rows = await db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        filename: submissions.filename,
        originalFilename: submissions.originalFilename,
        fileType: submissions.fileType,
        fileSize: submissions.fileSize,
        filePath: submissions.filePath,
        category: submissions.category,
        status: submissions.status,
        additionalText: submissions.additionalText,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        reviewedAt: submissions.reviewedAt,
        reviewedBy: submissions.reviewedBy,
        reward: submissions.reward,
        rejectionReason: submissions.rejectionReason,
        cloudinaryPublicId: submissions.cloudinaryPublicId,
        cloudinaryUrl: submissions.cloudinaryUrl,
        username: users.username,
        displayName: users.displayName,
        telegramUsername: users.telegramUsername
      })
      .from(submissions)
      .leftJoin(users, sql`${submissions.userId} = ${users.id}::uuid`)
      .orderBy(desc(submissions.createdAt));

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      filename: row.filename,
      originalFilename: row.originalFilename,
      fileType: row.fileType,
      fileSize: row.fileSize,
      filePath: row.filePath,
      category: row.category,
      status: row.status,
      additionalText: row.additionalText,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy,
      reward: row.reward,
      rejectionReason: row.rejectionReason,
      cloudinaryPublicId: row.cloudinaryPublicId,
      cloudinaryUrl: row.cloudinaryUrl,
      user: row.userId
        ? {
            username: row.username ?? "",
            displayName: row.displayName ?? "",
            telegramUsername: row.telegramUsername ?? ""
          }
        : undefined
    }));
  }

  async getAllSubmissions(): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.createdAt));
  }

  async updateSubmissionStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string, 
    reward?: number, 
    rejectionReason?: string
  ): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set({
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reward,
        rejectionReason,
        updatedAt: new Date()
      })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  // ===== ADMIN OPERATIONS =====
  
  async createAdminAction(insertAction: InsertAdminAction | (Omit<InsertAdminAction, 'adminId'> & { adminId: string | 'system' })): Promise<AdminAction> {
    const actionData: InsertAdminAction = {
      ...insertAction,
      adminId: insertAction.adminId || 'system'
    };

    const [action] = await db
      .insert(adminActions)
      .values(actionData)
      .returning();
    return action;
  }

  async getAdminActions(): Promise<AdminAction[]> {
    return await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt));
  }

  async getAdminActionsWithUsers(): Promise<AdminAction[]> {
    const rows = await db
      .select({
        id: adminActions.id,
        adminId: adminActions.adminId,
        action: adminActions.action,
        targetType: adminActions.targetType,
        targetId: adminActions.targetId,
        details: adminActions.details,
        createdAt: adminActions.createdAt,
        username: users.username,
        displayName: users.displayName,
        telegramUsername: users.telegramUsername
      })
      .from(adminActions)
      .leftJoin(users, sql`${adminActions.adminId} = ${users.id}::uuid`)
      .orderBy(desc(adminActions.createdAt));

    return rows.map(row => ({
      id: row.id,
      adminId: row.adminId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      details: row.details,
      createdAt: row.createdAt,
      admin: row.adminId
        ? {
            username: row.username ?? "",
            displayName: row.displayName ?? "",
            telegramUsername: row.telegramUsername ?? ""
          }
        : undefined
    }));
  }

  // ===== SUBSCRIPTION SCREENSHOT OPERATIONS =====
  
  async getUsersWithPendingSubscriptionScreenshots(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.subscriptionScreenshotStatus, 'pending'))
      .orderBy(desc(users.subscriptionScreenshotUploadedAt));
  }

  async updateUserSubscriptionScreenshot(id: string, updates: {
    subscriptionScreenshotUrl?: string;
    subscriptionScreenshotStatus?: string;
    subscriptionScreenshotUploadedAt?: Date;
    subscriptionScreenshotReviewedAt?: Date;
    subscriptionScreenshotReviewedBy?: string;
    subscriptionScreenshotRejectionReason?: string;
    subscriptionScreenshotCloudinaryPublicId?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ===== TOURNAMENT OPERATIONS =====
  
  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db
      .insert(tournaments)
      .values(insertTournament)
      .returning();
    return tournament;
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt));
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(sql`${tournaments.status} != 'cancelled' AND ${tournaments.status} != 'completed'`)
      .orderBy(tournaments.startDate);
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
    const [tournament] = await db
      .update(tournaments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string): Promise<void> {
    await db
      .delete(tournaments)
      .where(eq(tournaments.id, id));
  }

  async incrementTournamentParticipants(id: string): Promise<void> {
    await db
      .update(tournaments)
      .set({ 
        currentParticipants: sql`${tournaments.currentParticipants} + 1`,
        updatedAt: new Date()
      })
      .where(eq(tournaments.id, id));
  }

  async decrementTournamentParticipants(id: string): Promise<void> {
    await db
      .update(tournaments)
      .set({ 
        currentParticipants: sql`GREATEST(${tournaments.currentParticipants} - 1, 0)`,
        updatedAt: new Date()
      })
      .where(eq(tournaments.id, id));
  }

  async getTournamentWithDetails(id: string): Promise<TournamentWithDetails | undefined> {
    const tournament = await this.getTournament(id);
    if (!tournament) return undefined;

    const registrations = await this.getTournamentRegistrations(id);
    const creator = await this.getUser(tournament.createdBy);

    return {
      ...tournament,
      creator: creator ? {
        username: creator.username,
        displayName: creator.displayName
      } : undefined,
      registrations: await Promise.all(
        registrations.map(async (reg) => {
          const user = await this.getUser(reg.userId);
          return {
            ...reg,
            user: user ? {
              username: user.username,
              displayName: user.displayName
            } : undefined
          };
        })
      )
    };
  }

  // ===== TOURNAMENT REGISTRATION OPERATIONS =====
  
  async registerForTournament(insertRegistration: InsertTournamentRegistration): Promise<TournamentRegistration> {
    const [registration] = await db
      .insert(tournamentRegistrations)
      .values(insertRegistration)
      .returning();
    return registration;
  }

  async getTournamentRegistration(tournamentId: string, userId: string): Promise<TournamentRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, userId)
        )
      );
    return registration || undefined;
  }

  async getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    return await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId))
      .orderBy(desc(tournamentRegistrations.registeredAt));
  }

  async getUserTournamentRegistrations(userId: string): Promise<TournamentRegistration[]> {
    return await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.userId, userId))
      .orderBy(desc(tournamentRegistrations.registeredAt));
  }

  async cancelTournamentRegistration(id: string): Promise<void> {
    await db
      .delete(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, id));
  }

  // ===== STATISTICS =====
  
  async getUserStats(userId: string): Promise<{
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
    isAdmin: boolean;
  }> {
    const userSubmissions = await this.getSubmissionsByUserId(userId);
    
    const stats = {
      totalSubmissions: userSubmissions.length,
      approvedSubmissions: userSubmissions.filter(s => s.status === 'approved').length,
      pendingSubmissions: userSubmissions.filter(s => s.status === 'pending').length,
      rejectedSubmissions: userSubmissions.filter(s => s.status === 'rejected').length,
      isAdmin: (await this.getUser(userId))?.isAdmin || false,
      totalEarnings: userSubmissions
        .filter(s => s.status === 'approved' && s.reward)
        .reduce((sum, s) => sum + (s.reward || 0), 0)
    };
    
    return stats;
  }
}

export const storage = new DatabaseStorage();