import type { FastifyInstance } from 'fastify'
import { Err } from '../../types/errors.js'

export default async function userRoutes(app: FastifyInstance) {
  // 公開ユーザープロフィール
  app.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const user = await app.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          userId: true,
          name: true,
          bio: true,
          imageUrl: true,
          createdAt: true,
          _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
        },
      })

      if (!user) throw Err.notFound('USER_NOT_FOUND')

      return {
        ok: true,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          bio: user.bio,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt.toISOString(),
          articleCount: user._count.articles,
        },
      }
    }
  )
}
