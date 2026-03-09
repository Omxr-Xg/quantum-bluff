import { prisma } from '../config/database';

async function main() {
  console.log('Seeding database...');
  // Add your seed logic here
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
