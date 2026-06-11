-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "region_name" TEXT NOT NULL,
    "region_code" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state_id" TEXT,
    "district_id" TEXT,

    CONSTRAINT "manager_scopes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "states" ADD COLUMN "region_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_name_key" ON "regions"("region_name");
CREATE UNIQUE INDEX "regions_region_code_key" ON "regions"("region_code");
CREATE INDEX "states_region_id_idx" ON "states"("region_id");
CREATE INDEX "manager_scopes_user_id_idx" ON "manager_scopes"("user_id");
CREATE INDEX "manager_scopes_state_id_idx" ON "manager_scopes"("state_id");
CREATE INDEX "manager_scopes_district_id_idx" ON "manager_scopes"("district_id");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "manager_scopes" ADD CONSTRAINT "manager_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_scopes" ADD CONSTRAINT "manager_scopes_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_scopes" ADD CONSTRAINT "manager_scopes_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
