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
  killHistory, // 🆕 ДОБАВИТЬ ЭТУ СТРОКУ
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
  type InsertTelegramVerification,
  type KillHistory, // 🆕 ДОБАВИТЬ ЭТУ СТРОКУ
  type InsertKillHistory, // 🆕 ДОБАВИТЬ ЭТУ СТРОКУ
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

  addKillToUser(
    userId: string,
    killType: 'gold' | 'silver' | 'bronze',
    rewardAmount: number,
    submissionId?: string,
    grantedBy?: string,
    reason?: string,
    metadata?: any
  ): Promise<{ user: User; killHistory: KillHistory }>;
  
  getUserKillHistory(userId: string, limit?: number): Promise<KillHistory[]>;
  getAllKillHistory(limit?: number): Promise<KillHistory[]>;
  getKillHistoryBySubmission(submissionId: string): Promise<KillHistory | undefined>;
  getUserKillStats(userId: string): Promise<{
    goldKills: number;
    silverKills: number;
    bronzeKills: number;
    totalKills: number;
    lastKillDate: Date | null;
  }>;
}

export class DatabaseStorage implements IStorage {

  async addKillToUser(
    userId: string,
    killType: 'gold' | 'silver' | 'bronze',
    rewardAmount: number,
    submissionId?: string,
    grantedBy?: string,
    reason?: string,
    metadata?: any
  ): Promise<{ user: User; killHistory: KillHistory }> {
    // Получаем текущего пользователя
    const currentUser = await this.getUser(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Обновляем счетчики в зависимости от типа килла
    const updates: Partial<User> = {
      totalKills: currentUser.totalKills + 1,
      updatedAt: new Date()
    };

    switch (killType) {
      case 'gold':
        updates.goldKills = currentUser.goldKills + 1;
        break;
      case 'silver':
        updates.silverKills = currentUser.silverKills + 1;
        break;
      case 'bronze':
        updates.bronzeKills = currentUser.bronzeKills + 1;
        break;
    }

    // Обновляем пользователя
    const updatedUser = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning() as User[];

    // Создаем запись в истории киллов
    const killHistoryRecord = await db
      .insert(killHistory)
      .values({
        userId,
        killType,
        rewardAmount,
        submissionId: submissionId || null,
        grantedBy: grantedBy || null,
        reason: reason || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning() as KillHistory[];

    console.log(`✅ Kill added: ${killType} for user ${userId} (submission: ${submissionId || 'none'})`);

    return {
      user: updatedUser[0],
      killHistory: killHistoryRecord[0]
    };
  }

  /**
   * Получает историю киллов пользователя
   */
  async getUserKillHistory(userId: string, limit: number = 50): Promise<KillHistory[]> {
    const records = await db
      .select({
        id: killHistory.id,
        userId: killHistory.userId,
        killType: killHistory.killType,
        submissionId: killHistory.submissionId,
        rewardAmount: killHistory.rewardAmount,
        grantedBy: killHistory.grantedBy,
        reason: killHistory.reason,
        metadata: killHistory.metadata,
        createdAt: killHistory.createdAt,
        // Join submission info
        submissionCategory: submissions.category,
        submissionFilename: submissions.originalFilename,
        // Join granted by user info
        grantedByUsername: users.username,
        grantedByDisplayName: users.displayName,
      })
      .from(killHistory)
      .leftJoin(submissions, eq(killHistory.submissionId, submissions.id))
      .leftJoin(users, eq(killHistory.grantedBy, users.id))
      .where(eq(killHistory.userId, userId))
      .orderBy(desc(killHistory.createdAt))
      .limit(limit);

    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      killType: record.killType,
      submissionId: record.submissionId,
      rewardAmount: record.rewardAmount,
      grantedBy: record.grantedBy,
      reason: record.reason,
      metadata: record.metadata,
      createdAt: record.createdAt,
      submission: record.submissionCategory ? {
        category: record.submissionCategory,
        originalFilename: record.submissionFilename || ''
      } : undefined,
      grantedByUser: record.grantedByUsername ? {
        username: record.grantedByUsername,
        displayName: record.grantedByDisplayName || ''
      } : undefined
    })) as KillHistory[];
  }

  /**
   * Получает всю историю киллов (для админки)
   */
  async getAllKillHistory(limit: number = 100): Promise<KillHistory[]> {
    const records = await db
      .select({
        id: killHistory.id,
        userId: killHistory.userId,
        killType: killHistory.killType,
        submissionId: killHistory.submissionId,
        rewardAmount: killHistory.rewardAmount,
        grantedBy: killHistory.grantedBy,
        reason: killHistory.reason,
        metadata: killHistory.metadata,
        createdAt: killHistory.createdAt,
        // Join user info
        username: users.username,
        displayName: users.displayName,
        // Join submission info
        submissionCategory: submissions.category,
        submissionFilename: submissions.originalFilename,
      })
      .from(killHistory)
      .leftJoin(users, eq(killHistory.userId, users.id))
      .leftJoin(submissions, eq(killHistory.submissionId, submissions.id))
      .orderBy(desc(killHistory.createdAt))
      .limit(limit);

    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      killType: record.killType,
      submissionId: record.submissionId,
      rewardAmount: record.rewardAmount,
      grantedBy: record.grantedBy,
      reason: record.reason,
      metadata: record.metadata,
      createdAt: record.createdAt,
      user: record.username ? {
        username: record.username,
        displayName: record.displayName || ''
      } : undefined,
      submission: record.submissionCategory ? {
        category: record.submissionCategory,
        originalFilename: record.submissionFilename || ''
      } : undefined
    })) as KillHistory[];
  }

  /**
   * Получает запись о килле по ID сабмишина
   */
  async getKillHistoryBySubmission(submissionId: string): Promise<KillHistory | undefined> {
    const result = await db
      .select()
      .from(killHistory)
      .where(eq(killHistory.submissionId, submissionId))
      .limit(1) as KillHistory[];
    
    return result[0] || undefined;
  }

  /**
   * Получает статистику киллов пользователя
   */
  async getUserKillStats(userId: string): Promise<{
    goldKills: number;
    silverKills: number;
    bronzeKills: number;
    totalKills: number;
    lastKillDate: Date | null;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return {
        goldKills: 0,
        silverKills: 0,
        bronzeKills: 0,
        totalKills: 0,
        lastKillDate: null
      };
    }

    // Получаем последний килл
    const lastKill = await db
      .select()
      .from(killHistory)
      .where(eq(killHistory.userId, userId))
      .orderBy(desc(killHistory.createdAt))
      .limit(1) as KillHistory[];

    return {
      goldKills: user.goldKills,
      silverKills: user.silverKills,
      bronzeKills: user.bronzeKills,
      totalKills: user.totalKills,
      lastKillDate: lastKill[0]?.createdAt || null
    };
  }

  // ОБНОВИТЬ МЕТОД getUserStats ЧТОБЫ ВКЛЮЧАТЬ КИЛЛЫ
  async getUserStats(userId: string): Promise<{
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
    isAdmin: boolean;
    goldKills: number;      // 🆕
    silverKills: number;    // 🆕
    bronzeKills: number;    // 🆕
    totalKills: number;     // 🆕
  }> {
    const userSubmissions = await this.getSubmissionsByUserId(userId);
    const user = await this.getUser(userId);
    
    const stats = {
      totalSubmissions: userSubmissions.length,
      approvedSubmissions: userSubmissions.filter(s => s.status === 'approved').length,
      pendingSubmissions: userSubmissions.filter(s => s.status === 'pending').length,
      rejectedSubmissions: userSubmissions.filter(s => s.status === 'rejected').length,
      isAdmin: user?.isAdmin || false,
      totalEarnings: userSubmissions
        .filter(s => s.status === 'approved' && s.reward)
        .reduce((sum, s) => sum + (s.reward || 0), 0),
      // 🆕 Добавляем статистику киллов
      goldKills: user?.goldKills || 0,
      silverKills: user?.silverKills || 0,
      bronzeKills: user?.bronzeKills || 0,
      totalKills: user?.totalKills || 0,
    };
    
    return stats;
  }
  // ===== USER OPERATIONS =====
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)) as User[];
    return result[0] || undefined;
  }


async getAllUsers(): Promise<User[]> {
  
  const result = await db
    .select({
      id: users.id,
      epicGamesId: users.epicGamesId,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      balance: users.balance,
      isAdmin: users.isAdmin,
      
      // 🆕 Kill fields - ДОБАВИТЬ ЭТИ СТРОКИ
      goldKills: users.goldKills,
      silverKills: users.silverKills,
      bronzeKills: users.bronzeKills,
      totalKills: users.totalKills,
      
      // Telegram fields
      telegramUsername: users.telegramUsername,
      telegramChatId: users.telegramChatId,
      telegramPhotoUrl: users.telegramPhotoUrl,
      telegramFirstName: users.telegramFirstName,
      telegramLastName: users.telegramLastName,
      
      // Discord fields
      discordUsername: users.discordUsername,
      discordId: users.discordId,
      discordEmail: users.discordEmail,
      discordAvatar: users.discordAvatar,
      
      // Subscription screenshot fields
      subscriptionScreenshotUrl: users.subscriptionScreenshotUrl,
      subscriptionScreenshotStatus: users.subscriptionScreenshotStatus,
      subscriptionScreenshotUploadedAt: users.subscriptionScreenshotUploadedAt,
      subscriptionScreenshotReviewedAt: users.subscriptionScreenshotReviewedAt,
      subscriptionScreenshotReviewedBy: users.subscriptionScreenshotReviewedBy,
      subscriptionScreenshotRejectionReason: users.subscriptionScreenshotRejectionReason,
      subscriptionScreenshotCloudinaryPublicId: users.subscriptionScreenshotCloudinaryPublicId,
      
      // Premium fields
      premiumTier: users.premiumTier,
      premiumStartDate: users.premiumStartDate,
      premiumEndDate: users.premiumEndDate,
      premiumAutoRenew: users.premiumAutoRenew,
      premiumSource: users.premiumSource,
      premiumExternalId: users.premiumExternalId,
      premiumLastChecked: users.premiumLastChecked,
      premiumGiftedBy: users.premiumGiftedBy,
      
      // Timestamps
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return result as User[];
}

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)) as User[];
    return result[0] || undefined;
  }

  async getUserByEpicGamesId(epicGamesId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.epicGamesId, epicGamesId)) as User[];
    return result[0] || undefined;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.discordId, discordId)) as User[];
    return result[0] || undefined;
  }

  async getUserByTelegramId(telegramChatId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramChatId, telegramChatId)) as User[];
    return result[0] || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(insertUser)
      .returning() as User[];
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning() as User[];
    return result[0];
  }

  // ===== DISCORD OAUTH OPERATIONS =====
  
  async linkDiscordAccount(userId: string, discordData: {
    discordId: string;
    discordUsername: string;
    discordEmail?: string;
    discordAvatar?: string;
  }): Promise<User> {
    const result = await db
      .update(users)
      .set({
        discordId: discordData.discordId,
        discordUsername: discordData.discordUsername,
        discordEmail: discordData.discordEmail || null,
        discordAvatar: discordData.discordAvatar || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning() as User[];
    
    console.log(`Discord linked for user ${userId}: ${discordData.discordUsername} (${discordData.discordId})`);
    return result[0];
  }

  async unlinkDiscordAccount(userId: string): Promise<User> {
    const result = await db
      .update(users)
      .set({
        discordId: null,
        discordUsername: null,
        discordEmail: null,
        discordAvatar: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning() as User[];
    
    console.log(`Discord unlinked for user ${userId}`);
    return result[0];
  }

  // ===== TELEGRAM OAUTH OPERATIONS =====
  
  async linkTelegramAccount(userId: string, telegramData: {
    telegramChatId: string;
    telegramUsername: string;
    telegramFirstName?: string;
    telegramLastName?: string;
    telegramPhotoUrl?: string;
  }): Promise<User> {
    const result = await db
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
      .returning() as User[];
    
    console.log(`Telegram linked for user ${userId}: ${telegramData.telegramUsername} (${telegramData.telegramChatId})`);
    return result[0];
  }

  async unlinkTelegramAccount(userId: string): Promise<User> {
    const result = await db
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
      .returning() as User[];
    
    console.log(`Telegram unlinked for user ${userId}`);
    return result[0];
  }

  // ===== TELEGRAM VERIFICATION OPERATIONS =====
  
  async createTelegramVerification(data: {
    userId: string;
    code: string;
    expiresAt: Date;
  }): Promise<TelegramVerification> {
    await db
      .delete(telegramVerifications)
      .where(eq(telegramVerifications.userId, data.userId));

    const result = await db
      .insert(telegramVerifications)
      .values(data)
      .returning() as TelegramVerification[];
    
    console.log(`Created Telegram verification code ${data.code} for user ${data.userId} (expires: ${data.expiresAt.toISOString()})`);
    return result[0];
  }

  async getTelegramVerification(code: string): Promise<TelegramVerification | undefined> {
    const result = await db
      .select()
      .from(telegramVerifications)
      .where(
        and(
          eq(telegramVerifications.code, code.toUpperCase()),
          sql`${telegramVerifications.expiresAt} > NOW()`
        )
      ) as TelegramVerification[];
    
    if (result[0]) {
      console.log(`Found valid verification code ${code} for user ${result[0].userId}`);
    } else {
      console.log(`Verification code ${code} not found or expired`);
    }
    
    return result[0] || undefined;
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
    const result = await db
      .insert(balanceTransactions)
      .values(insertTransaction)
      .returning() as BalanceTransaction[];
    return result[0];
  }

  async getUserBalanceTransactions(userId: string, limit: number = 20): Promise<BalanceTransaction[]> {
    return await db
      .select()
      .from(balanceTransactions)
      .where(eq(balanceTransactions.userId, userId))
      .orderBy(desc(balanceTransactions.createdAt))
      .limit(limit) as BalanceTransaction[];
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
    
    const result = await db
      .update(users)
      .set({ 
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning() as User[];
    
    await this.createBalanceTransaction({
      userId: id,
      type,
      amount: deltaAmount,
      description,
      sourceType,
      sourceId
    });
    
    return result[0];
  }

  // ===== PREMIUM OPERATIONS =====

  async createPremiumHistory(insertHistory: InsertPremiumHistory): Promise<PremiumHistory> {
    const result = await db
      .insert(premiumHistory)
      .values(insertHistory)
      .returning() as PremiumHistory[];
    return result[0];
  }

  async getPremiumHistory(userId: string): Promise<PremiumHistory[]> {
    return await db
      .select()
      .from(premiumHistory)
      .where(eq(premiumHistory.userId, userId))
      .orderBy(desc(premiumHistory.createdAt)) as PremiumHistory[];
  }

  async getPremiumUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.premiumTier} != 'none'`)
      .orderBy(users.premiumEndDate) as User[];
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
      ) as User[];
    
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
    const result = await db
      .insert(withdrawalRequests)
      .values(insertRequest)
      .returning() as WithdrawalRequest[];
    return result[0];
  }

  async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt)) as WithdrawalRequest[];
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt)) as WithdrawalRequest[];
  }

  async getWithdrawalRequest(id: string): Promise<WithdrawalRequest | undefined> {
    const result = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id)) as WithdrawalRequest[];
    return result[0] || undefined;
  }

  async updateWithdrawalRequest(id: string, updates: Partial<WithdrawalRequest>): Promise<WithdrawalRequest> {
    const result = await db
      .update(withdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning() as WithdrawalRequest[];
    return result[0];
  }

  // ===== SUBMISSION OPERATIONS =====
  
  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const result = await db
      .insert(submissions)
      .values(insertSubmission)
      .returning() as Submission[];
    return result[0];
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id)) as Submission[];
    return result[0] || undefined;
  }

  async getSubmissionsByUserId(userId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt)) as Submission[];
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
      .orderBy(desc(submissions.createdAt)) as Submission[];
  }

  async updateSubmissionStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string, 
    reward?: number, 
    rejectionReason?: string
  ): Promise<Submission> {
    const result = await db
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
      .returning() as Submission[];
    return result[0];
  }

  // ===== ADMIN OPERATIONS =====
  
  async createAdminAction(insertAction: InsertAdminAction | (Omit<InsertAdminAction, 'adminId'> & { adminId: string | 'system' })): Promise<AdminAction> {
    const actionData: InsertAdminAction = {
      ...insertAction,
      adminId: insertAction.adminId || 'system'
    };

    const result = await db
      .insert(adminActions)
      .values(actionData)
      .returning() as AdminAction[];
    return result[0];
  }

  async getAdminActions(): Promise<AdminAction[]> {
    return await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt)) as AdminAction[];
  }

  // server/storage.ts

// server/storage.ts - найди метод getAdminActionsWithUsers и замени его на:

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
    .leftJoin(users, and(
      sql`${adminActions.adminId}::text = ${users.id}::text`,
      sql`${adminActions.adminId} != 'system'`
    ))
    .orderBy(desc(adminActions.createdAt));

  return rows.map(row => ({
    id: row.id,
    adminId: row.adminId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    createdAt: row.createdAt,
    admin: row.adminId === 'system' 
      ? undefined 
      : row.username
        ? {
            username: row.username,
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
      .orderBy(desc(users.subscriptionScreenshotUploadedAt)) as User[];
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
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning() as User[];
    return result[0];
  }

  // ===== TOURNAMENT OPERATIONS =====
  
  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const result = await db
      .insert(tournaments)
      .values(insertTournament)
      .returning() as Tournament[];
    return result[0];
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const result = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, id)) as Tournament[];
    return result[0] || undefined;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt)) as Tournament[];
  }

  async getActiveTournaments(): Promise<Tournament[]> {
    return await db
      .select()
      .from(tournaments)
      .where(sql`${tournaments.status} != 'cancelled' AND ${tournaments.status} != 'completed'`)
      .orderBy(tournaments.startDate) as Tournament[];
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
    const result = await db
      .update(tournaments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning() as Tournament[];
    return result[0];
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
    const result = await db
      .insert(tournamentRegistrations)
      .values(insertRegistration)
      .returning() as TournamentRegistration[];
    return result[0];
  }

  async getTournamentRegistration(tournamentId: string, userId: string): Promise<TournamentRegistration | undefined> {
    const result = await db
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.userId, userId)
        )
      ) as TournamentRegistration[];
    return result[0] || undefined;
  }

  async getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    return await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.tournamentId, tournamentId))
      .orderBy(desc(tournamentRegistrations.registeredAt)) as TournamentRegistration[];
  }

  async getUserTournamentRegistrations(userId: string): Promise<TournamentRegistration[]> {
    return await db
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.userId, userId))
      .orderBy(desc(tournamentRegistrations.registeredAt)) as TournamentRegistration[];
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