import prisma from '../prisma/client';
import { backfillUserGeoFromText, seedGeoMaster } from '../data/seedGeoMaster';

async function main() {
  const result = await seedGeoMaster();
  console.log(`Geo sync complete: ${result.stateCount} states, ${result.districtCount} districts`);

  const remapped = await backfillUserGeoFromText();
  if (remapped) console.log(`Remapped geo for ${remapped} user(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
