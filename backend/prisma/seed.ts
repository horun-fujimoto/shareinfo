import { PrismaClient } from './generated/client.js'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 管理者ユーザー作成
  const passwordHash = await argon2.hash('admin123', {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 2 ** 16,
  })

  await prisma.user.upsert({
    where: { userId: 'admin' },
    update: {},
    create: {
      userId: 'admin',
      name: 'システム管理者',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  })

  // 一般ユーザー作成
  const userPasswordHash = await argon2.hash('password123', {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 2 ** 16,
  })

  await prisma.user.upsert({
    where: { userId: 'user001' },
    update: {},
    create: {
      userId: 'user001',
      name: '山田 太郎',
      email: 'yamada@example.com',
      passwordHash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  })

  await prisma.user.upsert({
    where: { userId: 'user002' },
    update: {},
    create: {
      userId: 'user002',
      name: '佐藤 花子',
      email: 'sato@example.com',
      passwordHash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  })

  // タグ作成
  const tags = [
    { name: '業務改善', color: '#e91e8c' },
    { name: 'Tips', color: '#f59e0b' },
    { name: 'トラブル対応', color: '#ef4444' },
    { name: 'ツール紹介', color: '#3b82f6' },
    { name: '新人向け', color: '#10b981' },
    { name: 'お知らせ', color: '#8b5cf6' },
    { name: '社内イベント', color: '#f97316' },
    { name: 'マニュアル', color: '#06b6d4' },
  ]

  for (let i = 0; i < tags.length; i++) {
    await prisma.tag.upsert({
      where: { name: tags[i].name },
      update: {},
      create: {
        name: tags[i].name,
        color: tags[i].color,
        sortOrder: i,
      },
    })
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
