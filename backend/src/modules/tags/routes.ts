import type { FastifyInstance } from 'fastify'
import { Err } from '../../types/errors.js'
import { validate, createTagSchema, updateTagSchema } from '../../utils/validation.js'

export default async function tagRoutes(app: FastifyInstance) {
  // タグ一覧
  app.get('/tags', { preHandler: app.auth.requireUser }, async () => {
    const tags = await app.prisma.tag.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        sortOrder: true,
        _count: { select: { articles: true } },
      },
    })

    return {
      ok: true,
      tags: tags.map((t) => ({
        ...t,
        articleCount: t._count.articles,
      })),
    }
  })

  // タグ作成（管理者のみ）
  app.post<{ Body: { name: string; color?: string } }>(
    '/admin/tags',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      const { name, color } = validate(createTagSchema, req.body)

      const tag = await app.prisma.tag.create({
        data: {
          name: name.trim(),
          color: color || '#e91e8c',
        },
      })

      return { ok: true, tag }
    }
  )

  // タグ更新（管理者のみ）
  app.patch<{ Params: { id: string }; Body: { name?: string; color?: string; sortOrder?: number } }>(
    '/admin/tags/:id',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      const { name, color } = validate(updateTagSchema, req.body)
      const { sortOrder } = req.body as { sortOrder?: number }

      const tag = await app.prisma.tag.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
      })

      return { ok: true, tag }
    }
  )

  // タグ削除（管理者のみ）
  app.delete<{ Params: { id: string } }>(
    '/admin/tags/:id',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      await app.prisma.tag.delete({ where: { id: req.params.id } })
      return { ok: true }
    }
  )
}
