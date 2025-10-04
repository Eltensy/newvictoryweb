// shared/territory-schema.ts - Territory-specific schemas
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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
  'queue_expired'
]);

// ===== TERRITORY SYSTEM TABLES =====

// Territory Templates Table
export const territoryTemplates = pgTable("territory_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mapImageUrl: text("map_image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"), // Will reference users.id but no FK constraint for flexibility
});

// Territories Table
export const territories = pgTable("territories", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => territoryTemplates.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Territory polygon points stored as JSON
  points: jsonb("points").notNull(), // Array of {x: number, y: number}
  
  // Visual properties
  color: text("color").notNull().default("#3B82F6"),
  priority: integer("priority").notNull().default(1),
  
  // Ownership
  ownerId: uuid("owner_id"), // References users.id but no FK constraint
  claimedAt: timestamp("claimed_at"),
  
  // Territory properties
  isActive: boolean("is_active").default(true).notNull(),
  maxOwners: integer("max_owners").default(1),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Territory Claims History Table
export const territoryClaims = pgTable("territory_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  territoryId: uuid("territory_id").references(() => territories.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").notNull(), // References users.id
  claimType: territoryClaimTypeEnum("claim_type").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  
  assignedBy: uuid("assigned_by"), // References users.id
  reason: text("reason"),
});

// Territory Queue Table
export const territoryQueue = pgTable("territory_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  territoryId: uuid("territory_id").references(() => territories.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").notNull(), // References users.id
  priority: integer("priority").notNull().default(1),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: territoryQueueStatusEnum("status").notNull().default("pending"),
  reason: text("reason"),
  
  reviewedBy: uuid("reviewed_by"), // References users.id
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

// User Territory Stats
export const userTerritoryStats = pgTable("user_territory_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // References users.id
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
  userId: uuid("user_id").notNull(), // References users.id
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data for the notification
  read: boolean("read").default(false).notNull(),
  territoryId: uuid("territory_id"), // Optional reference to territory
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== RELATIONS =====

export const territoryTemplatesRelations = relations(territoryTemplates, ({ many }) => ({
  territories: many(territories),
}));

export const territoriesRelations = relations(territories, ({ one, many }) => ({
  template: one(territoryTemplates, {
    fields: [territories.templateId],
    references: [territoryTemplates.id],
  }),
  claims: many(territoryClaims),
  queueEntries: many(territoryQueue),
}));

export const territoryClaimsRelations = relations(territoryClaims, ({ one }) => ({
  territory: one(territories, {
    fields: [territoryClaims.territoryId],
    references: [territories.id],
  }),
}));

export const territoryQueueRelations = relations(territoryQueue, ({ one }) => ({
  territory: one(territories, {
    fields: [territoryQueue.territoryId],
    references: [territories.id],
  }),
}));

export const territoryNotificationsRelations = relations(territoryNotifications, ({ one }) => ({
  territory: one(territories, {
    fields: [territoryNotifications.territoryId],
    references: [territories.id],
  }),
}));

// ===== ZOD SCHEMAS =====

// Territory schemas
export const insertTerritoryTemplateSchema = createInsertSchema(territoryTemplates, {
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mapImageUrl: z.string().url().optional(),
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
});

export const insertTerritoryClaimSchema = createInsertSchema(territoryClaims);
export const insertTerritoryQueueSchema = createInsertSchema(territoryQueue);

// Notification schemas
export const insertTerritoryNotificationSchema = createInsertSchema(territoryNotifications);

// API validation schemas
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

export const createTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  mapImageUrl: z.string().url().optional(),
});

// ===== TYPES =====

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