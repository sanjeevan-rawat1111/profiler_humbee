import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    name: 'Admin User',
    mobileNumber: '9000000001',
    password: 'Admin1234',
    role: 'admin' as const,
    region: 'HUMBEE',
  },
  {
    name: 'Demo Officer',
    mobileNumber: '9000000002',
    password: 'User1234',
    role: 'user' as const,
    region: 'HUMBEE',
  },
  {
    name: 'Heartbeat User',
    mobileNumber: '0000000000',
    password: 'Ping@20p95',
    role: 'user' as const,
    region: 'SYSTEM',
  },
];

async function ensureUser(
  name: string,
  mobileNumber: string,
  password: string,
  role: 'admin' | 'user',
  region: string,
) {
  const existing = await prisma.user.findUnique({ where: { mobileNumber } });
  if (existing) {
    if (!existing.name) {
      await prisma.user.update({ where: { mobileNumber }, data: { name } });
      console.log(`- Updated name for ${mobileNumber}`);
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
      region,
    },
  });
  console.log(`- Created ${role} user: ${name} (${mobileNumber}, region: ${region})`);
}

async function main() {
  console.log('Seeding database...');

  for (const user of DEFAULT_USERS) {
    await ensureUser(user.name, user.mobileNumber, user.password, user.role, user.region);
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
