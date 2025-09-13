ALTER TABLE "submissions" DROP CONSTRAINT "submissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "filename" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "original_filename" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "original_filename" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "file_type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "category" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "reviewed_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "cloudinary_public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "cloudinary_url" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;