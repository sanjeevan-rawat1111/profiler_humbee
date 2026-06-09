import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    username: 'admin',
    password: 'Admin1234',
    role: 'admin' as const,
    region: 'HUMBEE',
  },
  {
    username: 'user',
    password: 'User1234',
    role: 'user' as const,
    region: 'HUMBEE',
  },
];

async function ensureUser(
  username: string,
  password: string,
  role: 'admin' | 'user',
  region: string,
) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`- Skipped ${username} (already exists)`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      plainPassword: password,
      role,
      region,
    },
  });
  console.log(`- Created ${role} user: ${username} (password: ${password}, region: ${region})`);
}

async function main() {
  console.log('Seeding database...');

  for (const user of DEFAULT_USERS) {
    await ensureUser(user.username, user.password, user.role, user.region);
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
