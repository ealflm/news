import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from monorepo root (prisma/seed.ts -> prisma -> packages/db -> packages -> root)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!@#';
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, displayName: name },
  });

  console.log(`Seeded user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
