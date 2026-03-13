import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'

export default async function viewHistoryRoutes(app: FastifyInstance) {
  // 閲覧履歴一覧
  app.get<{
    Querystring: { page?: string; pageSize?: string }
  }>('/view-history', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
    const skip = (page - 1) * pageSize

    const [histories, total] = await Promise.all([
      app.prisma.viewHistory.findMany({
        where: { userId: authedUser.id },
        orderBy: { viewedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          viewedAt: true,
          article: {
            select: {
              id: true,
              title: true,
              likeCount: true,
              publishedAt: true,
              author: {
                select: { id: true, name: true, imageUrl: true },
              },
              tags: {
                select: { tag: { select: { id: true, name: true, color: true } } },
              },
            },
          },
        },
      }),
      app.prisma.viewHistory.count({ where: { userId: authedUser.id } }),
    ])

    return {
      ok: true,
      histories: histories.map((h) => ({
        ...h,
        viewedAt: h.viewedAt.toISOString(),
        article: {
          ...h.article,
          tags: h.article.tags.map((t) => t.tag),
          publishedAt: h.article.publishedAt?.toISOString() ?? null,
        },
      })),
      total,
      page,
      pageSize,
    }
  })

  // いいねした記事一覧
  app.get<{
    Querystring: { page?: string; pageSize?: string }
  }>('/liked-articles', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
    const skip = (page - 1) * pageSize

    const [likes, total] = await Promise.all([
      app.prisma.like.findMany({
        where: { userId: authedUser.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          article: {
            select: {
              id: true,
              title: true,
              likeCount: true,
              publishedAt: true,
              author: {
                select: { id: true, name: true, imageUrl: true },
              },
              tags: {
                select: { tag: { select: { id: true, name: true, color: true } } },
              },
            },
          },
        },
      }),
      app.prisma.like.count({ where: { userId: authedUser.id } }),
    ])

    return {
      ok: true,
      likes: likes.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        article: {
          ...l.article,
          tags: l.article.tags.map((t) => t.tag),
          publishedAt: l.article.publishedAt?.toISOString() ?? null,
        },
      })),
      total,
      page,
      pageSize,
    }
  })
}
