import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Ajoute ici tes données de seed
  // Exemple:
  // await prisma.user.create({
  //   data: {
  //     username: 'admin',
  //     email: 'admin@quantum.com',
  //     password: 'hashed_password',
  //   },
  // });
  
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
