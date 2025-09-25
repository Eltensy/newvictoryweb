import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);
export const submissionCategoryEnum = pgEnum('submission_category', ['gold-kill', 'silver-kill', 'bronze-kill', 'victory', 'funny']);
export const fileTypeEnum = pgEnum('file_type', ['image', 'video']);
export const subscriptionScreenshotStatusEnum = pgEnum('subscription_screenshot_status', ['none', 'pending', 'approved', 'rejected']);

// Users table - UPDATED with subscription screenshot fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  epicGamesId: text("epic_games_id").unique(),
  username: text("username").unique(),
  displayName: text("display_name"),
  email: text("email"),
  balance: integer("balance").notNull().default(0),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  
  // Subscription screenshot fields
  subscriptionScreenshotUrl: text("subscription_screenshot_url"),
  subscriptionScreenshotStatus: varchar("subscription_screenshot_status", { length: 20 }).default("none"), // 'none', 'pending', 'approved', 'rejected'
  subscriptionScreenshotUploadedAt: timestamp("subscription_screenshot_uploaded_at"),
  subscriptionScreenshotReviewedAt: timestamp("subscription_screenshot_reviewed_at"),
  subscriptionScreenshotReviewedBy: varchar("subscription_screenshot_reviewed_by"), // Removed reference to allow 'system'
  subscriptionScreenshotRejectionReason: text("subscription_screenshot_rejection_reason"),
  subscriptionScreenshotCloudinaryPublicId: varchar("subscription_screenshot_cloudinary_public_id", { length: 255 }),
  
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
  filePath: text("file_path").notNull(), // Cloudinary URL
  category: varchar("category", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  additionalText: text("additional_text"), // Additional text for submission

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reward: integer("reward"),
  rejectionReason: text("rejection_reason"),

  // Cloudinary fields
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }),
  cloudinaryUrl: text("cloudinary_url"),
});

export const balanceTransactions = pgTable("balance_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'earning', 'bonus', 'withdrawal_request', 'withdrawal_completed'
  amount: integer("amount").notNull(), // In kopecks
  description: text("description").notNull(),
  sourceType: varchar("source_type", { length: 50 }), // 'submission', 'admin_bonus', 'withdrawal'
  sourceId: uuid("source_id"), // ID of related record
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(), // In kopecks
  method: varchar("method", { length: 50 }).notNull(), // 'telegram', 'card', 'crypto', 'paypal'
  methodData: text("method_data").notNull(), // JSON with withdrawal method data
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'processing', 'completed', 'rejected'
  processedBy: uuid("processed_by"), // Admin ID
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin actions table (for audit trail)
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(), // Removed reference to allow 'system'
  action: text("action").notNull(), // 'approve_submission', 'reject_submission', 'adjust_balance', 'auto_approve_subscription_screenshot', etc.
  targetType: text("target_type").notNull(), // 'submission', 'user', 'subscription_screenshot', etc.
  targetId: varchar("target_id").notNull(),
  details: text("details"), // JSON string with action details
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  adminActions: many(adminActions),
  reviewedSubmissions: many(submissions, { relationName: "reviewer" }),
  balanceTransactions: many(balanceTransactions),
  withdrawalRequests: many(withdrawalRequests),
  reviewedSubscriptionScreenshots: many(users, { relationName: "screenshotReviewer" }),
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

export const balanceTransactionsRelations = relations(balanceTransactions, ({ one }) => ({
  user: one(users, {
    fields: [balanceTransactions.userId],
    references: [users.id],
  }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, {
    fields: [withdrawalRequests.userId],
    references: [users.id],
  }),
  processedByAdmin: one(users, {
    fields: [withdrawalRequests.processedBy],
    references: [users.id],
    relationName: "processedBy",
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
  additionalText: z.string().max(500).optional(), // Max 500 chars, optional
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

// NEW: Subscription screenshot validation schemas
export const reviewSubscriptionScreenshotSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  // If rejected, rejection reason is required
  if (data.status === 'rejected') {
    return data.rejectionReason !== undefined && data.rejectionReason.trim().length > 0;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting subscription screenshot."
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Submission = typeof submissions.$inferSelect & {
  // Optional fields for joined data
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
};
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type AdminAction = typeof adminActions.$inferSelect & {
  // Optional fields for joined data
  admin?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
};
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

export type BalanceTransaction = typeof balanceTransactions.$inferSelect;
export type InsertBalanceTransaction = typeof balanceTransactions.$inferInsert;

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

// Existing validation schemas
export const updateUserBalanceSchema = z.object({
  amount: z.number(),
  reason: z.string().min(1, "Reason is required"),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
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

// Withdrawal schemas
export const insertBalanceTransactionSchema = createInsertSchema(balanceTransactions);
export const selectBalanceTransactionSchema = createSelectSchema(balanceTransactions);

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests, {
  amount: z.number().min(1000, "Minimum withdrawal amount is 1000 rubles").max(1000000, "Maximum withdrawal amount is 1,000,000 rubles"),
  method: z.enum(['telegram', 'card', 'crypto', 'paypal'], {
    errorMap: () => ({ message: "Select withdrawal method" })
  }),
  methodData: z.string().min(1, "Specify withdrawal data")
});

export const processWithdrawalSchema = z.object({
  status: z.enum(['processing', 'completed', 'rejected']),
  rejectionReason: z.string().optional()
});

export const createWithdrawalRequestSchema = z.object({
  amount: z.number().min(1000, "Minimum withdrawal amount is 1000 rubles"),
  method: z.enum(['telegram', 'card', 'crypto', 'paypal']),
  methodData: z.object({
    // For Telegram
    telegramUsername: z.string().optional(),
    
    // For bank card
    cardNumber: z.string().optional(),
    cardHolder: z.string().optional(),
    cardCountry: z.string().optional(),
    
    // For cryptocurrency
    walletAddress: z.string().optional(),
    currency: z.string().optional(),
    
    // For PayPal
    email: z.string().optional(),
    paypalEmail: z.string().optional(), // keeping for backward compatibility
  }).refine(data => {
    return Object.values(data).some(value => value !== undefined && value !== '');
  }, "Fill in data for the selected withdrawal method")
});

// Refined validation schema for withdrawal methods
export const validateWithdrawalMethodData = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("telegram"),
    methodData: z.object({
      telegramUsername: z.string().min(1, "Specify Telegram username"),
    })
  }),
  z.object({
    method: z.literal("card"),
    methodData: z.object({
      cardNumber: z.string().min(16, "Card number must contain at least 16 digits"),
      cardHolder: z.string().min(1, "Specify card holder name"),
      cardCountry: z.string().min(1, "Select card country"),
    })
  }),
  z.object({
    method: z.literal("crypto"),
    methodData: z.object({
      walletAddress: z.string().min(26, "Specify correct wallet address"),
      currency: z.string().default("USDT"),
    })
  }),
  z.object({
    method: z.literal("paypal"),
    methodData: z.object({
      email: z.string().email("Specify correct PayPal email"),
    })
  }),
]);