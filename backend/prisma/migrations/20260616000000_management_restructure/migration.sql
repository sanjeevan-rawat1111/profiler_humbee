-- Region metadata
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Region ↔ State junction
CREATE TABLE "region_states" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "region_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "region_states_state_id_key" ON "region_states"("state_id");
CREATE INDEX "region_states_region_id_idx" ON "region_states"("region_id");

INSERT INTO "region_states" ("id", "region_id", "state_id")
SELECT gen_random_uuid()::text, "region_id", "id"
FROM "states"
WHERE "region_id" IS NOT NULL;

ALTER TABLE "region_states" ADD CONSTRAINT "region_states_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "region_states" ADD CONSTRAINT "region_states_state_id_fkey"
  FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manager ↔ Region junction
CREATE TABLE "user_regions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,

    CONSTRAINT "user_regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_regions_user_id_region_id_key" ON "user_regions"("user_id", "region_id");
CREATE INDEX "user_regions_user_id_idx" ON "user_regions"("user_id");
CREATE INDEX "user_regions_region_id_idx" ON "user_regions"("region_id");

INSERT INTO "user_regions" ("id", "user_id", "region_id")
SELECT DISTINCT gen_random_uuid()::text, ms."user_id", rs."region_id"
FROM "manager_scopes" ms
JOIN "region_states" rs ON rs."state_id" = ms."state_id"
WHERE ms."state_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user_regions" ur
    WHERE ur."user_id" = ms."user_id" AND ur."region_id" = rs."region_id"
  );

INSERT INTO "user_regions" ("id", "user_id", "region_id")
SELECT DISTINCT gen_random_uuid()::text, ms."user_id", rs."region_id"
FROM "manager_scopes" ms
JOIN "districts" d ON d."id" = ms."district_id"
JOIN "region_states" rs ON rs."state_id" = d."state_id"
WHERE ms."district_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user_regions" ur
    WHERE ur."user_id" = ms."user_id" AND ur."region_id" = rs."region_id"
  );

-- Drop legacy structures
DROP TABLE "manager_scopes";

ALTER TABLE "states" DROP CONSTRAINT IF EXISTS "states_region_id_fkey";
DROP INDEX IF EXISTS "states_region_id_idx";
ALTER TABLE "states" DROP COLUMN IF EXISTS "region_id";

ALTER TABLE "user_regions" ADD CONSTRAINT "user_regions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_regions" ADD CONSTRAINT "user_regions_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
