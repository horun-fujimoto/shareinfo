import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'

export default async function likeRoutes(app: FastifyInstance) {
  // いいねトグル
  app.post<{ Params: { articleId: string } }>(
    '/articles/:articleId/like',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const articleId = req.params.articleId

      const article = await app.prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true, authorId: true },
      })
      if (!article) throw Err.notFound('ARTICLE_NOT_FOUND')

      const existing = await app.prisma.like.findUnique({
        where: { articleId_userId: { articleId, userId: authedUser.id } },
      })

      if (existing) {
        // いいね解除（トランザクション）
        await app.prisma.$transaction([
          app.prisma.like.delete({
            where: { articleId_userId: { articleId, userId: authedUser.id } },
          }),
          app.prisma.article.update({
            where: { id: articleId },
            data: { likeCount: { decrement: 1 } },
          }),
        ])
        return { ok: true, liked: false }
      } else {
        // いいね追加（トランザクション）
        await app.prisma.$transaction(async (tx) => {
          await tx.like.create({
            data: { articleId, userId: authedUser.id },
          })
          await tx.article.update({
            where: { id: articleId },
            data: { likeCount: { increment: 1 } },
          })
        })

        // 通知（自分自身は除外）
        if (article.authorId !== authedUser.id) {
          const settings = await app.prisma.userSettings.findUnique({
            where: { userId: article.authorId },
          })
          if (!settings || settings.notifyOnLike) {
            await app.prisma.notification.create({
              data: {
                type: 'LIKE',
                recipientId: article.authorId,
                actorId: authedUser.id,
                articleId,
              },
            })
          }
        }

        return { ok: true, liked: true }
      }
    }
  )
}
