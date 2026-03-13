import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'
import { validate, createCommentSchema } from '../../utils/validation.js'

export default async function commentRoutes(app: FastifyInstance) {
  // 記事のコメント一覧
  app.get<{ Params: { articleId: string } }>(
    '/articles/:articleId/comments',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const comments = await app.prisma.comment.findMany({
        where: { articleId: req.params.articleId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, userId: true, name: true, imageUrl: true },
          },
        },
      })

      return {
        ok: true,
        comments: comments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      }
    }
  )

  // コメント投稿
  app.post<{ Params: { articleId: string }; Body: { content: string } }>(
    '/articles/:articleId/comments',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const { content } = validate(createCommentSchema, req.body)

      const article = await app.prisma.article.findUnique({
        where: { id: req.params.articleId },
        select: { id: true, authorId: true },
      })
      if (!article) throw Err.notFound('ARTICLE_NOT_FOUND')

      const comment = await app.prisma.comment.create({
        data: {
          content: content.trim(),
          articleId: req.params.articleId,
          authorId: authedUser.id,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: { id: true, userId: true, name: true, imageUrl: true },
          },
        },
      })

      // 通知（自分自身のコメントは除外）
      if (article.authorId !== authedUser.id) {
        const settings = await app.prisma.userSettings.findUnique({
          where: { userId: article.authorId },
        })
        if (!settings || settings.notifyOnComment) {
          await app.prisma.notification.create({
            data: {
              type: 'COMMENT',
              recipientId: article.authorId,
              actorId: authedUser.id,
              articleId: article.id,
              commentId: comment.id,
            },
          })
        }
      }

      return { ok: true, comment }
    }
  )

  // コメント削除
  app.delete<{ Params: { articleId: string; commentId: string } }>(
    '/articles/:articleId/comments/:commentId',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const comment = await app.prisma.comment.findUnique({
        where: { id: req.params.commentId },
        select: { authorId: true },
      })

      if (!comment) throw Err.notFound('COMMENT_NOT_FOUND')
      if (comment.authorId !== authedUser.id && req.user?.role !== 'ADMIN') {
        throw Err.forbidden('NOT_AUTHOR')
      }

      await app.prisma.comment.delete({ where: { id: req.params.commentId } })

      return { ok: true }
    }
  )
}
