-- Add name column (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "name" VARCHAR(255);

-- Backfill existing users with User1, User2, ...
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at", id) AS rn
  FROM "users"
  WHERE "name" IS NULL
)
UPDATE "users" u
SET "name" = 'User' || n.rn
FROM numbered n
WHERE u.id = n.id;

ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

-- Store display name on audit logs for reporting
ALTER TABLE "audit_logs" ADD COLUMN "name" VARCHAR(255);

UPDATE "audit_logs" al
SET "name" = u."name"
FROM "users" u
WHERE al."user_id" = u.id AND al."name" IS NULL;
