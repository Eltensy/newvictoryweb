import { 
  users, 
  submissions, 
  adminActions,
  type User, 
  type InsertUser, 
  type Submission, 
  type InsertSubmission,
  type AdminAction,
  type InsertAdminAction 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

// Updated storage interface to support new functionality
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEpicGamesId(epicGamesId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserBalance(id: string, deltaAmount: number): Promise<User>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissionsByUserId(userId: string): Promise<Submission[]>;
  getAllSubmissions(): Promise<Submission[]>;
  updateSubmissionStatus(id: string, status: 'approved' | 'rejected', reviewerId: string, reward?: number, rejectionReason?: string): Promise<Submission>;
  
  // Admin operations
  createAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(): Promise<AdminAction[]>;
  
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
  // User operations
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

  async updateUserBalance(id: string, deltaAmount: number): Promise<User> {
    // Get current user first
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
    return user;
  }

  // Submission operations
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

  // Admin operations
  async createAdminAction(insertAction: InsertAdminAction): Promise<AdminAction> {
    const [action] = await db
      .insert(adminActions)
      .values(insertAction)
      .returning();
    return action;
  }

  async getAdminActions(): Promise<AdminAction[]> {
    return await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt));
  }

  // Statistics
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