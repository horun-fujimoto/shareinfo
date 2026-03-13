import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'

export default async function bookmarkRoutes(app: FastifyInstance) {
  // ブックマークトグル
  app.post<{ Params: { articleId: string } }>(
    '/articles/:articleId/bookmark',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const articleId = req.params.articleId

      const article = await app.prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true },
      })
      if (!article) throw Err.notFound('ARTICLE_NOT_FOUND')

      const existing = await app.prisma.bookmark.findUnique({
        where: { articleId_userId: { articleId, userId: authedUser.id } },
      })

      if (existing) {
        await app.prisma.bookmark.delete({
          where: { articleId_userId: { articleId, userId: authedUser.id } },
        })
        return { ok: true, bookmarked: false }
      } else {
        await app.prisma.bookmark.create({
          data: { articleId, userId: authedUser.id },
        })
        return { ok: true, bookmarked: true }
      }
    }
  )

  // ブックマーク一覧
  app.get<{
    Querystring: { page?: string; pageSize?: string }
  }>('/bookmarks', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
    const skip = (page - 1) * pageSize

    const [bookmarks, total] = await Promise.all([
      app.prisma.bookmark.findMany({
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
      app.prisma.bookmark.count({ where: { userId: authedUser.id } }),
    ])

    return {
      ok: true,
      bookmarks: bookmarks.map((b) => ({
        ...b,
        article: {
          ...b.article,
          tags: b.article.tags.map((t) => t.tag),
          publishedAt: b.article.publishedAt?.toISOString() ?? null,
        },
        createdAt: b.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  })
}
