import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'

export default async function settingsRoutes(app: FastifyInstance) {
  // 設定取得
  app.get('/settings', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)

    let settings = await app.prisma.userSettings.findUnique({
      where: { userId: authedUser.id },
    })

    if (!settings) {
      settings = await app.prisma.userSettings.create({
        data: { userId: authedUser.id },
      })
    }

    return { ok: true, settings }
  })

  // 設定更新
  app.patch<{
    Body: { notifyOnLike?: boolean; notifyOnComment?: boolean }
  }>('/settings', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const { notifyOnLike, notifyOnComment } = req.body

    const settings = await app.prisma.userSettings.upsert({
      where: { userId: authedUser.id },
      create: {
        userId: authedUser.id,
        ...(notifyOnLike !== undefined ? { notifyOnLike } : {}),
        ...(notifyOnComment !== undefined ? { notifyOnComment } : {}),
      },
      update: {
        ...(notifyOnLike !== undefined ? { notifyOnLike } : {}),
        ...(notifyOnComment !== undefined ? { notifyOnComment } : {}),
      },
    })

    return { ok: true, settings }
  })
}
