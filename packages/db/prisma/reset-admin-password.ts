import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const username = process.env.SEED_ADMIN_USERNAME;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!username || !password) {
  throw new Error('SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash(password!, 12);
  const u = await prisma.user.update({
    where: { username: username! },
    data: { passwordHash },
  });
  console.log(`Reset password for @${u.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
