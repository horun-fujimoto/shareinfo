import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'

export default async function notificationRoutes(app: FastifyInstance) {
  // 通知一覧
  app.get<{
    Querystring: { page?: string; pageSize?: string }
  }>('/notifications', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
    const skip = (page - 1) * pageSize

    const [notifications, total, unreadCount] = await Promise.all([
      app.prisma.notification.findMany({
        where: { recipientId: authedUser.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          type: true,
          articleId: true,
          commentId: true,
          isRead: true,
          createdAt: true,
          actor: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      }),
      app.prisma.notification.count({ where: { recipientId: authedUser.id } }),
      app.prisma.notification.count({
        where: { recipientId: authedUser.id, isRead: false },
      }),
    ])

    return {
      ok: true,
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      total,
      unreadCount,
      page,
      pageSize,
    }
  })

  // 未読数取得
  app.get('/notifications/unread-count', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const count = await app.prisma.notification.count({
      where: { recipientId: authedUser.id, isRead: false },
    })
    return { ok: true, count }
  })

  // 既読にする
  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      await app.prisma.notification.updateMany({
        where: { id: req.params.id, recipientId: authedUser.id },
        data: { isRead: true },
      })
      return { ok: true }
    }
  )

  // 全て既読にする
  app.post('/notifications/read-all', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    await app.prisma.notification.updateMany({
      where: { recipientId: authedUser.id, isRead: false },
      data: { isRead: true },
    })
    return { ok: true }
  })
}
