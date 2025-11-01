-- Migration: Add tournament-dropmap linking fields
-- Date: 2025-01-31

-- Add dropMapId to tournaments table
ALTER TABLE "tournaments" ADD COLUMN "drop_map_id" uuid;

-- Add Discord map channel fields
ALTER TABLE "tournaments" ADD COLUMN "discord_map_channel_id" text;
ALTER TABLE "tournaments" ADD COLUMN "discord_map_message_id" text;

-- Add foreign key constraint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_drop_map_id_drop_map_settings_id_fk"
  FOREIGN KEY ("drop_map_id") REFERENCES "drop_map_settings"("id") ON DELETE SET NULL;

-- Add tournamentId and teamMode to drop_map_settings table
ALTER TABLE "drop_map_settings" ADD COLUMN "tournament_id" uuid;
ALTER TABLE "drop_map_settings" ADD COLUMN "team_mode" "tournament_team_mode" DEFAULT 'solo';

-- Add foreign key constraint
ALTER TABLE "drop_map_settings" ADD CONSTRAINT "drop_map_settings_tournament_id_tournaments_id_fk"
  FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_tournaments_drop_map_id" ON "tournaments"("drop_map_id");
CREATE INDEX IF NOT EXISTS "idx_drop_map_settings_tournament_id" ON "drop_map_settings"("tournament_id");
