import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { backfillUserGeoFromText, findGeoByNames, seedGeoMaster } from '../data/seedGeoMaster';
import { userGeoFields } from '../utils/userGeo';

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    mobileNumber: '9000000001',
    password: 'Admin1234',
    role: 'admin' as const,
    stateName: 'Delhi',
    districtName: 'New Delhi',
  },
  {
    name: 'Demo Officer',
    mobileNumber: '9000000002',
    password: 'User1234',
    role: 'user' as const,
    stateName: 'Uttar Pradesh',
    districtName: 'Ghaziabad',
  },
  {
    name: 'Heartbeat User',
    mobileNumber: '0000000000',
    password: 'Ping@20p95',
    role: 'user' as const,
    stateName: 'Delhi',
    districtName: 'New Delhi',
  },
];

async function ensureUser(
  name: string,
  mobileNumber: string,
  password: string,
  role: 'admin' | 'user',
  stateName: string,
  districtName: string,
) {
  const geo = await findGeoByNames(stateName, districtName);
  if (!geo) {
    throw new Error(`Geo master missing for ${stateName} / ${districtName}`);
  }

  const existing = await prisma.user.findUnique({ where: { mobileNumber } });
  if (existing) {
    await prisma.user.update({
      where: { mobileNumber },
      data: {
        name,
        stateId: geo.stateId,
        districtId: geo.districtId,
        state: geo.stateName,
        district: geo.districtName,
        ...userGeoFields(geo.stateName),
      },
    });
    console.log(`- Updated ${mobileNumber}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      mobileNumber,
      passwordHash,
      plainPassword: password,
      role,
      stateId: geo.stateId,
      districtId: geo.districtId,
      state: geo.stateName,
      district: geo.districtName,
      ...userGeoFields(geo.stateName),
    },
  });
  console.log(`- Created ${role} user: ${name} (${mobileNumber}, ${geo.stateName}/${geo.districtName})`);
}

async function main() {
  console.log('Seeding database...');

  const geo = await seedGeoMaster();
  console.log(`- Geo master: ${geo.stateCount} states, ${geo.districtCount} districts`);

  const backfilled = await backfillUserGeoFromText();
  if (backfilled) console.log(`- Backfilled geo for ${backfilled} existing user(s)`);

  for (const user of DEFAULT_USERS) {
    await ensureUser(
      user.name,
      user.mobileNumber,
      user.password,
      user.role,
      user.stateName,
      user.districtName,
    );
  }

  console.log('Database seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
