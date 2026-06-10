-- Ensure all mobile numbers are valid 10-digit numeric before enforcing constraints
UPDATE "users"
SET "mobile_number" = RIGHT(
  '9' || regexp_replace(substring(replace("id", '-', ''), 1, 9), '[^0-9]', '', 'g'),
  10
)
WHERE "mobile_number" !~ '^[0-9]{10}$';

-- Remove username; mobile_number is the sole user identifier
DROP INDEX IF EXISTS "users_username_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
