import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";


const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {

  const alice = await prisma.user.upsert({
    where: { email: "alice@quantumbluff.com" },
    update: {},
    create: {
      username: "alice",
      email: "alice@quantumbluff.com",
      password: "$2b$10$examplehashedpassword", // mot de passe hashé
      chips: 1000,
      level: 1,
      stats: {
        create: {
          wins: 5,
          totalGames: 12,
          biggestPot: 300
        }
      }
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@quantumbluff.com" },
    update: {},
    create: {
      username: "bob",
      email: "bob@quantumbluff.com",
      password: "$2b$10$examplehashedpassword",
      chips: 1200,
      level: 2,
      stats: {
        create: {
          wins: 8,
          totalGames: 20,
          biggestPot: 500
        }
      }
    },
  });

    const marie = await prisma.user.upsert({
    where: { email: "marie@quantumbluff.com" },
    update: {},
    create: {
      username: "mar27",
      email: "marie@quantumbluff.com",
      password: "$2b$10$examplehashedpassword",
      chips: 2000,
      level: 5,
      stats: {
        create: {
          wins: 7,
          totalGames: 15,
          biggestPot: 600
        }
      }
    },
  });


  const elodie = await prisma.user.upsert({
    where: { email: "elo@quantumbluff.com" },
    update: {},
    create: {
      username: "elo",
      email: "elo@quantumbluff.com",
      password: "$2b$10$examplehashedpassword",
      chips: 1000,
      level: 4,
      stats: {
        create: {
          wins: 5,
          totalGames: 10,
          biggestPot: 700
        }
      }
    },
  });


  const colo = await prisma.user.upsert({
    where: { email: "colo@quantumbluff.com" },
    update: {},
    create: {
      username: "colo",
      email: "colo@quantumbluff.com",
      password: "$2b$10$examplehashedpassword",
      chips: 100,
      level: 3,
      stats: {
        create: {
          wins: 2,
          totalGames: 5,
          biggestPot: 400
        }
      }
    },
  });


  console.log({ alice, bob, marie, elodie, colo });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
