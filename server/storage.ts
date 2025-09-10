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
import { eq, desc } from "drizzle-orm";

// Updated storage interface to support new functionality
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
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
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
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
  }> {
    const userSubmissions = await this.getSubmissionsByUserId(userId);
    
    const stats = {
      totalSubmissions: userSubmissions.length,
      approvedSubmissions: userSubmissions.filter(s => s.status === 'approved').length,
      pendingSubmissions: userSubmissions.filter(s => s.status === 'pending').length,
      rejectedSubmissions: userSubmissions.filter(s => s.status === 'rejected').length,
      totalEarnings: userSubmissions
        .filter(s => s.status === 'approved' && s.reward)
        .reduce((sum, s) => sum + (s.reward || 0), 0)
    };
    
    return stats;
  }
}

export const storage = new DatabaseStorage();