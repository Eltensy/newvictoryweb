import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums - ИСПРАВЛЕНО: добавлена запятая между 'gold-kill' и 'silver-kill'
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);
export const submissionCategoryEnum = pgEnum('submission_category', ['gold-kill', 'silver-kill', 'bronze-kill', 'victory', 'funny']);
export const fileTypeEnum = pgEnum('file_type', ['image', 'video']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  epicGamesId: text("epic_games_id").unique(),
  username: text("username").unique(), // Made nullable for OAuth flow
  displayName: text("display_name"),
  email: text("email"),
  balance: integer("balance").notNull().default(0),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Submissions table
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }),
  fileType: varchar("file_type", { length: 20 }).notNull(), // 'image' | 'video'
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(), // Теперь здесь Cloudinary URL
  category: varchar("category", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reward: integer("reward"),
  rejectionReason: text("rejection_reason"),
  
  // Новые поля для Cloudinary
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }),
  cloudinaryUrl: text("cloudinary_url"), // Дублируем URL для удобства
});

// Admin actions table (for audit trail)
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'approve_submission', 'reject_submission', 'adjust_balance', etc.
  targetType: text("target_type").notNull(), // 'submission', 'user', etc.
  targetId: varchar("target_id").notNull(),
  details: text("details"), // JSON string with action details
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  adminActions: many(adminActions),
  reviewedSubmissions: many(submissions, { relationName: "reviewer" }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [submissions.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  admin: one(users, {
    fields: [adminActions.adminId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions, {
  fileSize: z.number().min(1).max(50 * 1024 * 1024), // 50MB max
  category: z.enum(["gold-kill", "silver-kill", "bronze-kill", "victory", "funny"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reward: true,
  rejectionReason: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Submission = typeof submissions.$inferSelect & {
  // Добавляем опциональные поля для joined данных
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
};
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;


export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

export const updateUserBalanceSchema = z.object({
  amount: z.number(), // Убрали userId - он берется из URL параметра
  reason: z.string().min(1, "Reason is required"), // Сделали обязательным
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected']), // Убрали submissionId - он берется из URL параметра
  reward: z.number().positive().optional(),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  // If approved, reward is required and must be positive
  if (data.status === 'approved') {
    return data.reward !== undefined && data.reward > 0;
  }
  // If rejected, rejection reason is required
  if (data.status === 'rejected') {
    return data.rejectionReason !== undefined && data.rejectionReason.trim().length > 0;
  }
  return true;
}, {
  message: "For approved submissions, a positive reward is required. For rejected submissions, a rejection reason is required."
});

export const linkTelegramSchema = z.object({
  telegramUsername: z.string().min(1).max(50),
});