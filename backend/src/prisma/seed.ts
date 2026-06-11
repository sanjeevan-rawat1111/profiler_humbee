import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { userGeoFields } from '../utils/userGeo';

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    mobileNumber: '9000000001',
    password: 'Admin1234',
    role: 'admin' as const,
    state: 'HUMBEE',
    district: 'HQ',
  },
  {
    name: 'Demo Officer',
    mobileNumber: '9000000002',
    password: 'User1234',
    role: 'user' as const,
    state: 'HUMBEE',
    district: 'Central',
  },
  {
    name: 'Heartbeat User',
    mobileNumber: '0000000000',
    password: 'Ping@20p95',
    role: 'user' as const,
    state: 'SYSTEM',
    district: 'System',
  },
];

async function ensureUser(
  name: string,
  mobileNumber: string,
  password: string,
  role: 'admin' | 'user',
  state: string,
  district: string,
) {
  const existing = await prisma.user.findUnique({ where: { mobileNumber } });
  if (existing) {
    const updates: Record<string, string> = {};
    if (!existing.name) updates.name = name;
    if (!existing.state) updates.state = state;
    if (!existing.district) updates.district = district;
    if (Object.keys(updates).length) {
      const nextState = updates.state ?? (existing.state || state);
      const nextDistrict = updates.district ?? (existing.district || district);
      await prisma.user.update({
        where: { mobileNumber },
        data: { ...updates, ...userGeoFields(nextState, nextDistrict) },
      });
      console.log(`- Updated fields for ${mobileNumber}`);
    } else {
      console.log(`- Skipped ${mobileNumber} (already exists)`);
    }
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
      ...userGeoFields(state, district),
    },
  });
  console.log(`- Created ${role} user: ${name} (${mobileNumber}, ${state}/${district})`);
}

async function main() {
  console.log('Seeding database...');

  for (const user of DEFAULT_USERS) {
    await ensureUser(user.name, user.mobileNumber, user.password, user.role, user.state, user.district);
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
