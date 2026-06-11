-- Create states master table
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "states_state_name_key" ON "states"("state_name");
CREATE UNIQUE INDEX "states_state_code_key" ON "states"("state_code");

-- Create districts master table
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "district_name" TEXT NOT NULL,
    "district_code" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "districts_district_code_key" ON "districts"("district_code");
CREATE UNIQUE INDEX "districts_state_id_district_name_key" ON "districts"("state_id", "district_name");
CREATE INDEX "districts_state_id_idx" ON "districts"("state_id");

ALTER TABLE "districts" ADD CONSTRAINT "districts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link users to geo master (nullable until seed backfill)
ALTER TABLE "users" ADD COLUMN "state_id" TEXT;
ALTER TABLE "users" ADD COLUMN "district_id" TEXT;

ALTER TABLE "users" ADD CONSTRAINT "users_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
