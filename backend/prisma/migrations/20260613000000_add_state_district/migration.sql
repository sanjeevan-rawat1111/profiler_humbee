-- Add state and district to users
ALTER TABLE "users" ADD COLUMN "state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "district" TEXT NOT NULL DEFAULT '';
UPDATE "users" SET "state" = "region", "district" = '' WHERE "state" = '';

-- Add state and district to audit_logs
ALTER TABLE "audit_logs" ADD COLUMN "state" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "district" TEXT;
UPDATE "audit_logs" SET "state" = "region", "district" = '' WHERE "state" IS NULL;
UPDATE "audit_logs" AS al
SET "state" = u."state", "district" = u."district"
FROM "users" AS u
WHERE al."user_id" = u."id";
