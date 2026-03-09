import { prisma } from '../config/database.js';

async function main() {
  console.log('Seeding database...');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
