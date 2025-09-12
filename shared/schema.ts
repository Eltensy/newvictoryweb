import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  category: submissionCategoryEnum("category").notNull(),
  status: submissionStatusEnum("status").notNull().default('pending'),
  reward: integer("reward"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  status: true,
  reward: true,
  reviewedBy: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

// Additional validation schemas
export const updateUserBalanceSchema = z.object({
  userId: z.string(),
  amount: z.number(),
  reason: z.string().optional(),
});

export const reviewSubmissionSchema = z.object({
  submissionId: z.string(),
  status: z.enum(['approved', 'rejected']),
  reward: z.number().optional(),
  rejectionReason: z.string().optional(),
});

export const linkTelegramSchema = z.object({
  telegramUsername: z.string().min(1),
});