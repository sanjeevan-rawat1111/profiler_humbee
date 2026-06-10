-- Add mobile_number column for login authentication
ALTER TABLE "users" ADD COLUMN "mobile_number" TEXT;

-- Migrate existing seed users with deterministic mobile numbers
UPDATE "users" SET "mobile_number" = '9000000001' WHERE "username" = 'admin' AND "mobile_number" IS NULL;
UPDATE "users" SET "mobile_number" = '9000000002' WHERE "username" = 'user' AND "mobile_number" IS NULL;

-- Fallback for any other existing users: derive a unique 10-digit number from id
UPDATE "users"
SET "mobile_number" = '9' || LPAD(SUBSTRING(REPLACE("id", '-', ''), 1, 9), 9, '0')
WHERE "mobile_number" IS NULL;

ALTER TABLE "users" ALTER COLUMN "mobile_number" SET NOT NULL;

CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");
