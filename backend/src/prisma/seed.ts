import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.submission.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash('Admin1234', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      plainPassword: 'Admin1234',
      role: 'admin',
      region: 'HUMBEE',
    },
  });

  console.log('Database seeded successfully:');
  console.log(`- Created Admin user: ${admin.username} (password: Admin1234, region: HUMBEE)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
