import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/database.js'

const email = (process.env.E2E_EMAIL ?? 'e2e@quantum-bluff.test').trim().toLowerCase()
const password = process.env.E2E_PASSWORD ?? 'E2eTestPassword123!'
const username = (process.env.E2E_USERNAME ?? 'e2e_ci_player').trim()

async function main() {
  const hash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email },
    create: {
      username,
      email,
      password: hash,
      authProvider: 'LOCAL',
      passwordSetAt: new Date(),
      chips: 50_000,
    },
    update: {
      password: hash,
      chips: 50_000,
      loginStreakCount: 0,
      lastLoginRewardDayKey: null,
    },
  })
  console.log(`[seedE2eUser] OK — ${email}`)
}

main()
  .catch((err) => {
    console.error('[seedE2eUser] failed', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
