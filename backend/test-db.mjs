process.env.DATABASE_URL = 'postgresql://postgres:Aegis%23%23%23@localhost:5432/shareinfo?schema=public'
import { PrismaClient } from './prisma/generated/index.js'
const p = new PrismaClient()
try {
  const users = await p.user.findMany()
  console.log('OK - Users:', users.length)
} catch (e) {
  console.error('DB ERROR:', e.message)
} finally {
  await p.$disconnect()
}
