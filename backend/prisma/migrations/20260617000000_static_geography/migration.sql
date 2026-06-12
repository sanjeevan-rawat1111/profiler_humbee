-- Static geography: store CSV codes directly, not FK to master tables.
-- Drop constraints first so CSV state IDs can be inserted into region_states.

ALTER TABLE "region_states" DROP CONSTRAINT IF EXISTS "region_states_state_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_state_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_district_id_fkey";

DO $$
BEGIN
  IF to_regclass('public.states') IS NOT NULL THEN
    UPDATE "users" u
    SET "state_id" = s."state_code"
    FROM "states" s
    WHERE u."state_id" = s."id";

    UPDATE "region_states" rs
    SET "state_id" = s."state_code"
    FROM "states" s
    WHERE rs."state_id" = s."id";
  END IF;

  IF to_regclass('public.districts') IS NOT NULL THEN
    UPDATE "users" u
    SET "district_id" = d."district_code"
    FROM "districts" d
    WHERE u."district_id" = d."id";
  END IF;
END $$;

DROP TABLE IF EXISTS "districts";
DROP TABLE IF EXISTS "states";
