// shared/schema.ts - Combined database schema with territory integration
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ===== ENUMS =====

// Core application enums
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);
export const submissionCategoryEnum = pgEnum('submission_category', ['gold-kill', 'silver-kill', 'bronze-kill', 'victory', 'funny']);
export const fileTypeEnum = pgEnum('file_type', ['image', 'video']);
export const subscriptionScreenshotStatusEnum = pgEnum('subscription_screenshot_status', ['none', 'pending', 'approved', 'rejected']);

// Territory-specific enums
export const territoryClaimTypeEnum = pgEnum('territory_claim_type', ['claim', 'assign', 'revoke', 'queue_assign']);
export const territoryQueueStatusEnum = pgEnum('territory_queue_status', ['pending', 'approved', 'rejected', 'expired']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'territory_claimed', 
  'territory_lost', 
  'territory_assigned',
  'territory_revoked',
  'queue_approved', 
  'queue_rejected',
  'queue_expired',
  'submission_approved',
  'balance_updated',
  'withdrawal_processed'
]);

// Tournament enums
export const tournamentStatusEnum = pgEnum('tournament_status', [
  'upcoming',
  'registration_open', 
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled'
]);

export const tournamentRegistrationStatusEnum = pgEnum('tournament_registration_status', [
  'registered',
  'paid',
  'cancelled'
]);

export const premiumTierEnum = pgEnum('premium_tier', [
  'none',
  'basic',      // Базовый премиум (текущая функциональность)
  'gold',       // Золотой премиум (будущее расширение)
  'platinum',   // Платиновый премиум (будущее расширение)
  'vip'         // VIP премиум (будущее расширение)
]);

// ===== CORE TABLES =====

// Users table (ПЕРВАЯ - базовая таблица!)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  epicGamesId: text("epic_games_id").unique(),
  username: text("username").unique(),
  displayName: text("display_name"),
  email: text("email"),
  balance: integer("balance").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),

  // Telegram OAuth fields
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  telegramPhotoUrl: text("telegram_photo_url"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  
  // Discord OAuth fields
  discordUsername: text("discord_username"),
  discordId: text("discord_id").unique(), // Discord user ID
  discordEmail: text("discord_email"),
  discordAvatar: text("discord_avatar"),
  
  // Subscription screenshot fields
  subscriptionScreenshotUrl: text("subscription_screenshot_url"),
  subscriptionScreenshotStatus: subscriptionScreenshotStatusEnum("subscription_screenshot_status").default("none"),
  subscriptionScreenshotUploadedAt: timestamp("subscription_screenshot_uploaded_at"),
  subscriptionScreenshotReviewedAt: timestamp("subscription_screenshot_reviewed_at"),
  subscriptionScreenshotReviewedBy: uuid("subscription_screenshot_reviewed_by"),
  subscriptionScreenshotRejectionReason: text("subscription_screenshot_rejection_reason"),
  subscriptionScreenshotCloudinaryPublicId: varchar("subscription_screenshot_cloudinary_public_id", { length: 255 }),

  premiumTier: premiumTierEnum("premium_tier").default("none").notNull(),
  premiumStartDate: timestamp("premium_start_date"),
  premiumEndDate: timestamp("premium_end_date"),
  premiumAutoRenew: boolean("premium_auto_renew").default(false).notNull(),
  premiumSource: varchar("premium_source", { length: 50 }), // 'boosty', 'patreon', 'admin', 'manual'
  premiumExternalId: varchar("premium_external_id", { length: 255 }), // ID from Boosty/Patreon
  premiumLastChecked: timestamp("premium_last_checked"),
  premiumGiftedBy: uuid("premium_gifted_by").references(() => users.id),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const premiumHistory = pgTable("premium_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: premiumTierEnum("tier").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  grantedBy: uuid("granted_by").references(() => users.id),
  reason: text("reason"),
  autoRenewed: boolean("auto_renewed").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
// Tournaments table (после users)
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  mapUrl: text("map_url"),
  rules: text("rules"),
  
  // Financial
  prize: integer("prize").notNull().default(0),
  entryFee: integer("entry_fee").notNull().default(0),
  
  // Dates
  registrationStartDate: timestamp("registration_start_date").notNull(),
  registrationEndDate: timestamp("registration_end_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  
  // Participants
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").notNull().default(0),
  
  // Status
  status: tournamentStatusEnum("status").notNull().default('upcoming'),
  
  // Media
  imageUrl: text("image_url"),
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }),
  
  // Metadata
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tournament registrations table (после users и tournaments)
export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  status: tournamentRegistrationStatusEnum("status").notNull().default('registered'),
  teamName: varchar("team_name", { length: 100 }),
  additionalInfo: text("additional_info"),
  
  // Payment
  paidAmount: integer("paid_amount"),
  paidAt: timestamp("paid_at"),
  
  // Timestamps
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
});

// Submissions table
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }),
  fileType: fileTypeEnum("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  category: submissionCategoryEnum("category").notNull(),
  status: submissionStatusEnum("status").notNull().default("pending"),
  additionalText: text("additional_text"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reward: integer("reward"),
  rejectionReason: text("rejection_reason"),

  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }),
  cloudinaryUrl: text("cloudinary_url"),
});

// ===== NOTIFICATIONS SYSTEM =====
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== FINANCIAL TABLES =====
export const balanceTransactions = pgTable("balance_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: uuid("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(),
  method: varchar("method", { length: 50 }).notNull(),
  methodData: text("method_data").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin actions table
export const adminActions = pgTable("admin_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== TERRITORY SYSTEM TABLES =====
export const territoryShapes = pgTable("territory_shapes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // "Север", "Центр", "Юг" и т.д.
  points: jsonb("points").notNull(), // Координаты границ
  defaultColor: text("default_color").notNull().default("#000000"), // Черный по умолчанию
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Territory Templates Table
export const territoryTemplates = pgTable("territory_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mapImageUrl: text("map_image_url"),
  shapeIds: jsonb("shape_ids").notNull().default("[]"), // [id1, id2, ...]
  isActive: boolean("is_active").default(false).notNull(),
  tournamentId: uuid("tournament_id").references(() => tournaments.id), // НОВОЕ
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Territories Table
export const territories = pgTable("territories", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => territoryTemplates.id, { onDelete: 'cascade' }).notNull(),
  shapeId: uuid("shape_id").references(() => territoryShapes.id).notNull(), // НОВОЕ
  name: text("name").notNull(),
  color: text("color").notNull(), // Берется из shape.defaultColor
  ownerId: uuid("owner_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Territory Claims History Table
export const territoryClaims = pgTable("territory_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  territoryId: uuid("territory_id").references(() => territories.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  claimType: territoryClaimTypeEnum("claim_type").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  assignedBy: uuid("assigned_by").references(() => users.id),
  reason: text("reason"),
});

// Territory Queue Table
export const territoryQueue = pgTable("territory_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  territoryId: uuid("territory_id").references(() => territories.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  priority: integer("priority").notNull().default(1),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: territoryQueueStatusEnum("status").notNull().default("pending"),
  reason: text("reason"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

// User Territory Stats
export const userTerritoryStats = pgTable("user_territory_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  templateId: uuid("template_id").references(() => territoryTemplates.id, { onDelete: 'cascade' }).notNull(),
  totalTerritories: integer("total_territories").default(0).notNull(),
  totalClaimTime: integer("total_claim_time").default(0).notNull(),
  longestHoldTime: integer("longest_hold_time").default(0).notNull(),
  territoriesLost: integer("territories_lost").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Territory Notifications
export const territoryNotifications = pgTable("territory_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  read: boolean("read").default(false).notNull(),
  territoryId: uuid("territory_id").references(() => territories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== RELATIONS ===== (ПОСЛЕ ВСЕХ ТАБЛИЦ!)

export const territoryShapesRelations = relations(territoryShapes, ({ one, many }) => ({
  creator: one(users, {
    fields: [territoryShapes.createdBy],
    references: [users.id],
  }),
  territories: many(territories),
}));

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  reviewedSubmissions: many(submissions, { relationName: "reviewer" }),
  adminActions: many(adminActions),
  balanceTransactions: many(balanceTransactions),
  withdrawalRequests: many(withdrawalRequests),
  processedWithdrawals: many(withdrawalRequests, { relationName: "processedBy" }),
  notifications: many(notifications),
  tournamentRegistrations: many(tournamentRegistrations),
  createdTournaments: many(tournaments),
  ownedTerritories: many(territories),
  territoryClaims: many(territoryClaims),
  territoryQueue: many(territoryQueue),
  territoryStats: many(userTerritoryStats),
  territoryNotifications: many(territoryNotifications),
  createdTemplates: many(territoryTemplates, { relationName: "creator" }),
  assignedClaims: many(territoryClaims, { relationName: "assigner" }),
  reviewedQueue: many(territoryQueue, { relationName: "reviewer" }),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  creator: one(users, {
    fields: [tournaments.createdBy],
    references: [users.id],
  }),
  registrations: many(tournamentRegistrations),
}));

export const tournamentRegistrationsRelations = relations(tournamentRegistrations, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentRegistrations.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentRegistrations.userId],
    references: [users.id],
  }),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
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

export const territoryTemplatesRelations = relations(territoryTemplates, ({ one, many }) => ({
  territories: many(territories),
  tournament: one(tournaments, { // НОВОЕ
    fields: [territoryTemplates.tournamentId],
    references: [tournaments.id],
  }),
  creator: one(users, {
    fields: [territoryTemplates.createdBy],
    references: [users.id],
  }),
}));
export const territoriesRelations = relations(territories, ({ one, many }) => ({
  template: one(territoryTemplates, {
    fields: [territories.templateId],
    references: [territoryTemplates.id],
  }),
  shape: one(territoryShapes, { // НОВОЕ
    fields: [territories.shapeId],
    references: [territoryShapes.id],
  }),
  owner: one(users, {
    fields: [territories.ownerId],
    references: [users.id],
  }),
  claims: many(territoryClaims),
  queueEntries: many(territoryQueue),
  notifications: many(territoryNotifications),
}));
export const territoryClaimsRelations = relations(territoryClaims, ({ one }) => ({
  territory: one(territories, {
    fields: [territoryClaims.territoryId],
    references: [territories.id],
  }),
  user: one(users, {
    fields: [territoryClaims.userId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [territoryClaims.assignedBy],
    references: [users.id],
    relationName: "assigner",
  }),
}));

export const territoryQueueRelations = relations(territoryQueue, ({ one }) => ({
  territory: one(territories, {
    fields: [territoryQueue.territoryId],
    references: [territories.id],
  }),
  user: one(users, {
    fields: [territoryQueue.userId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [territoryQueue.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

export const territoryNotificationsRelations = relations(territoryNotifications, ({ one }) => ({
  user: one(users, {
    fields: [territoryNotifications.userId],
    references: [users.id],
  }),
  territory: one(territories, {
    fields: [territoryNotifications.territoryId],
    references: [territories.id],
  }),
}));

export const userTerritoryStatsRelations = relations(userTerritoryStats, ({ one }) => ({
  user: one(users, {
    fields: [userTerritoryStats.userId],
    references: [users.id],
  }),
  template: one(territoryTemplates, {
    fields: [userTerritoryStats.templateId],
    references: [territoryTemplates.id],
  }),
}));

// ===== ZOD SCHEMAS =====

export const createTerritoryShapeSchema = z.object({
  name: z.string().min(1).max(100),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })).min(3),
  defaultColor: z.string().regex(/^#[0-9A-F]{6}$/i).default("#000000"),
  description: z.string().optional(),
});

export const createTemplateWithShapesSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mapImageUrl: z.string().url().optional(),
  shapeIds: z.array(z.string().uuid()),
  tournamentId: z.string().uuid().optional(), // НОВОЕ
});

export const instantiateTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export const linkDiscordSchema = z.object({
  discordUsername: z.string().min(2).max(37),
});

export const grantPremiumSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(['basic', 'gold', 'platinum', 'vip']),
  durationDays: z.coerce.number().min(1).max(3650),
  reason: z.string().min(1).max(500),
  source: z.enum(['admin', 'manual', 'boosty', 'patreon']).default('admin'),
});


export const updatePremiumSchema = z.object({
  tier: z.enum(['none', 'basic', 'gold', 'platinum', 'vip']).optional(),
  endDate: z.coerce.date().optional(),
  autoRenew: z.boolean().optional(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Submission schemas
export const insertSubmissionSchema = createInsertSchema(submissions, {
  fileSize: z.number().min(1).max(50 * 1024 * 1024),
  category: z.enum(["gold-kill", "silver-kill", "bronze-kill", "victory", "funny"]),
  additionalText: z.string().max(500).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reward: true,
  rejectionReason: true,
});

// Tournament schemas (ОДНО объявление!)
export const insertTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  mapUrl: z.string().url().optional(),
  rules: z.string().optional(),
  prize: z.number().min(0),
  entryFee: z.number().min(0),
  registrationStartDate: z.coerce.date(),
  registrationEndDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  maxParticipants: z.number().min(1).optional().nullable(),
  createdBy: z.string().uuid(),
  imageUrl: z.string().optional().nullable(),
  cloudinaryPublicId: z.string().optional().nullable(),
});

export const updateTournamentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  mapUrl: z.string().url().optional(),
  rules: z.string().optional(),
  prize: z.number().min(0).optional(),
  entryFee: z.number().min(0).optional(),
  registrationStartDate: z.coerce.date().optional(),
  registrationEndDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  maxParticipants: z.number().min(1).optional().nullable(),
  status: z.enum(['upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const registerForTournamentSchema = z.object({
  teamName: z.string().max(100).optional(),
  additionalInfo: z.string().max(500).optional(),
});

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertTerritoryNotificationSchema = createInsertSchema(territoryNotifications);

// Admin action schemas
export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Territory schemas
export const insertTerritoryTemplateSchema = createInsertSchema(territoryTemplates, {
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mapImageUrl: z.string().url().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerritorySchema = createInsertSchema(territories, {
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })).min(3, "Territory must have at least 3 points"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  priority: z.number().min(1).max(10),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerritoryClaimSchema = createInsertSchema(territoryClaims);
export const insertTerritoryQueueSchema = createInsertSchema(territoryQueue);

// ===== VALIDATION SCHEMAS =====

export const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reward: z.number().positive().optional(),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  if (data.status === 'approved') {
    return data.reward !== undefined && data.reward > 0;
  }
  if (data.status === 'rejected') {
    return data.rejectionReason !== undefined && data.rejectionReason.trim().length > 0;
  }
  return true;
}, {
  message: "For approved submissions, a positive reward is required. For rejected submissions, a rejection reason is required."
});

export const updateUserBalanceSchema = z.object({
  amount: z.number(),
  reason: z.string().min(1, "Reason is required"),
});

export const linkTelegramSchema = z.object({
  telegramUsername: z.string().min(1).max(50),
});

export const reviewSubscriptionScreenshotSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  if (data.status === 'rejected') {
    return data.rejectionReason !== undefined && data.rejectionReason.trim().length > 0;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting subscription screenshot."
});

export const createWithdrawalRequestSchema = z.object({
  amount: z.number().min(1000, "Minimum withdrawal amount is 1000 rubles"),
  method: z.enum(['telegram', 'card', 'crypto', 'paypal']),
  methodData: z.object({
    telegramUsername: z.string().optional(),
    cardNumber: z.string().optional(),
    cardHolder: z.string().optional(),
    cardCountry: z.string().optional(),
    walletAddress: z.string().optional(),
    currency: z.string().optional(),
    email: z.string().optional(),
    paypalEmail: z.string().optional(),
  }).refine(data => {
    return Object.values(data).some(value => value !== undefined && value !== '');
  }, "Fill in data for the selected withdrawal method")
});

export const processWithdrawalSchema = z.object({
  status: z.enum(['processing', 'completed', 'rejected']),
  rejectionReason: z.string().optional()
});

// Territory API validation schemas
export const createTerritoryTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mapImageUrl: z.string().url().optional(),
});

export const createTerritoryRequestSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })).min(3),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  priority: z.number().min(1).max(10).default(1),
});

export const claimTerritoryRequestSchema = z.object({
  territoryId: z.string().uuid(),
  priority: z.number().min(1).max(10).default(1),
  reason: z.string().optional(),
  allowMultiple: z.boolean().optional().default(true),
  replaceExisting: z.boolean().optional().default(false),
});

export const assignTerritoryRequestSchema = z.object({
  territoryId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().min(1),
});

export const updateTerritoryRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })).min(3).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  priority: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

export const reviewTerritoryQueueSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
}).refine((data) => {
  if (data.status === 'rejected') {
    return data.reviewNotes !== undefined && data.reviewNotes.trim().length > 0;
  }
  return true;
}, {
  message: "Review notes are required when rejecting queue entry."
});

// ===== TYPES =====
export type TerritoryShape = typeof territoryShapes.$inferSelect;
export type InsertTerritoryShape = typeof territoryShapes.$inferInsert;

export type TerritoryShapeWithCreator = TerritoryShape & {
  creator?: {
    username: string;
    displayName: string;
  };
};

export type TerritoryTemplateWithShapes = TerritoryTemplate & {
  shapes: TerritoryShape[];
  territoryCount: number;
  claimedCount: number;
  tournament?: {
    id: string;
    name: string;
    status: string;
  };
};

export type TerritoryWithShape = Territory & {
  shape: TerritoryShape;
  owner?: {
    id: string;
    username: string;
    displayName: string;
  };
};

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Submission = typeof submissions.$inferSelect & {
  user?: {
    username: string;
    displayName: string;
    telegramUsername?: string;
  };
};
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type PremiumHistory = typeof premiumHistory.$inferSelect;
export type InsertPremiumHistory = typeof premiumHistory.$inferInsert;

export type Tournament = typeof tournaments.$inferSelect & {
  creator?: {
    username: string;
    displayName: string;
  };
};
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect & {
  user?: {
    username: string;
    displayName: string;
  };
  tournament?: {
    name: string;
    status: string;
  };
};
export type InsertTournamentRegistration = typeof tournamentRegistrations.$inferInsert;

export type TournamentWithDetails = Tournament & {
  registrations: TournamentRegistration[];
  isUserRegistered?: boolean;
  userRegistration?: TournamentRegistration;
};

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type AdminAction = typeof adminActions.$inferSelect & {
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

export type TerritoryTemplate = typeof territoryTemplates.$inferSelect;
export type InsertTerritoryTemplate = typeof territoryTemplates.$inferInsert;

export type Territory = typeof territories.$inferSelect;
export type InsertTerritory = typeof territories.$inferInsert;

export type TerritoryClaim = typeof territoryClaims.$inferSelect;
export type InsertTerritoryClaim = typeof territoryClaims.$inferInsert;

export type TerritoryQueue = typeof territoryQueue.$inferSelect;
export type InsertTerritoryQueue = typeof territoryQueue.$inferInsert;

export type TerritoryNotification = typeof territoryNotifications.$inferSelect;
export type InsertTerritoryNotification = typeof territoryNotifications.$inferInsert;

export type UserTerritoryStats = typeof userTerritoryStats.$inferSelect;



export function isPremiumActive(user: User): boolean {
  if (!user.premiumTier || user.premiumTier === 'none') return false;
  if (!user.premiumEndDate) return false;
  return new Date(user.premiumEndDate) > new Date();
}

// Get premium tier display name
export function getPremiumTierName(tier: string): string {
  switch (tier) {
    case 'basic': return 'Premium';
    case 'gold': return 'Gold Premium';
    case 'platinum': return 'Platinum Premium';
    case 'vip': return 'VIP Premium';
    default: return 'None';
  }
}

// Get premium tier color
export function getPremiumTierColor(tier: string): string {
  switch (tier) {
    case 'basic': return '#3B82F6'; // Blue
    case 'gold': return '#F59E0B';   // Gold
    case 'platinum': return '#A78BFA'; // Purple
    case 'vip': return '#EF4444';    // Red
    default: return '#6B7280';       // Gray
  }
}

// Get premium tier features
export function getPremiumTierFeatures(tier: string): string[] {
  const baseFeatures = [
    '🏆 Закрытые турниры',
    '💰 +10% к обмену золота',
    '🎯 Пропуск квалификаций',
    '🚀 Ранний доступ',
    '👑 VIP статус и чат',
  ];
  
  switch (tier) {
    case 'basic':
      return baseFeatures;
    case 'gold':
      return [...baseFeatures, '⭐ Золотой значок', '🎁 Эксклюзивные награды'];
    case 'platinum':
      return [...baseFeatures, '💎 Платиновый значок', '🎁 Эксклюзивные награды', '🔥 Приоритетная поддержка'];
    case 'vip':
      return [...baseFeatures, '👑 VIP значок', '🎁 Эксклюзивные награды', '🔥 Приоритетная поддержка', '🌟 Личный менеджер'];
    default:
      return [];
  }
}

// Additional stats type for territory statistics
export type TerritoryStats = {
  currentTerritories: number;
  queueEntries: number;
  totalClaims: number;
  territoriesRevoked: number;
};

// Extended types with relations
export type TerritoryWithOwner = Territory & {
  owner?: {
    id: string;
    username: string;
    displayName: string;
  };
};

export type TerritoryWithDetails = Territory & {
  owner?: {
    id: string;
    username: string;
    displayName: string;
  };
  template: TerritoryTemplate;
  queueCount?: number;
  userInQueue?: boolean;
};

export type TemplateWithStats = TerritoryTemplate & {
  territoryCount: number;
  claimedCount: number;
  createdBy?: {
    username: string;
    displayName: string;
  };
};

export type QueueEntryWithDetails = TerritoryQueue & {
  territory: {
    name: string;
    color: string;
  };
  user: {
    username: string;
    displayName: string;
  };
};


// ===== BACKWARD COMPATIBILITY ALIASES =====
// These are placed at the very end to ensure all referenced schemas are already defined

export const createTerritoryTemplateSchema = createTerritoryTemplateRequestSchema;
export const createTerritorySchema = createTerritoryRequestSchema;
export const claimTerritorySchema = claimTerritoryRequestSchema;
export const assignTerritorySchema = assignTerritoryRequestSchema;
export const updateTerritorySchema = updateTerritoryRequestSchema;