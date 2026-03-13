import type { FastifyInstance } from 'fastify'
import { Err } from '../../../types/errors.js'
import { cfg } from '../../../config/index.js'
import { validate, createUserSchema, updateUserSchema } from '../../../utils/validation.js'

type CreateUserBody = {
  userId: string
  name: string
  email?: string
  role?: string
  password?: string
}

type UpdateUserBody = {
  name?: string
  email?: string
  role?: string
  status?: string
}

export default async function adminUserRoutes(app: FastifyInstance) {
  // ユーザー一覧
  app.get<{
    Querystring: {
      page?: string
      pageSize?: string
      keyword?: string
      role?: string
      status?: string
    }
  }>('/admin/users', { preHandler: app.auth.requireAdmin }, async (req) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (req.query.keyword) {
      where.OR = [
        { userId: { contains: req.query.keyword, mode: 'insensitive' } },
        { name: { contains: req.query.keyword, mode: 'insensitive' } },
        { email: { contains: req.query.keyword, mode: 'insensitive' } },
      ]
    }

    if (req.query.role) {
      where.role = req.query.role
    }

    if (req.query.status) {
      where.status = req.query.status
    }

    const [users, total] = await Promise.all([
      app.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          status: true,
          imageUrl: true,
          loginFailCount: true,
          lockedAt: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      app.prisma.user.count({ where }),
    ])

    return {
      ok: true,
      users: users.map((u) => ({
        ...u,
        isLocked: (u.loginFailCount ?? 0) >= 5 || Boolean(u.lockedAt),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        lockedAt: u.lockedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  })

  // ユーザー作成
  app.post<{ Body: CreateUserBody }>(
    '/admin/users',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      const { userId, name, email, role, password } = validate(createUserSchema, req.body)

      const exists = await app.prisma.user.findUnique({ where: { userId } })
      if (exists) throw Err.conflict('USER_ID_EXISTS')

      const initialPassword = password || cfg.defaultPassword
      const passwordHash = await app.auth.hashPassword(initialPassword)

      const user = await app.prisma.user.create({
        data: {
          userId: userId.trim(),
          name: name.trim(),
          email: email?.trim() || null,
          role: (role as 'ADMIN' | 'USER') || 'USER',
          passwordHash,
          status: 'ACTIVE',
          mustChangePassword: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      })

      return { ok: true, user }
    }
  )

  // ユーザー更新
  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/admin/users/:id',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      const { name, email, role, status } = validate(updateUserSchema, req.body)

      const user = await app.prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(email !== undefined ? { email: email?.trim() || null } : {}),
          ...(role !== undefined ? { role: role as 'ADMIN' | 'USER' } : {}),
          ...(status !== undefined ? { status: status as 'ACTIVE' | 'INACTIVE' } : {}),
        },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      })

      return { ok: true, user }
    }
  )

  // ユーザー削除
  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      // 自分自身の削除は不可
      if (req.user?.id === req.params.id) {
        throw Err.badRequest('CANNOT_DELETE_SELF')
      }

      await app.prisma.user.delete({ where: { id: req.params.id } })
      return { ok: true }
    }
  )

  // ロック解除
  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/unlock',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      await app.prisma.user.update({
        where: { id: req.params.id },
        data: { loginFailCount: 0, lockedAt: null },
      })
      return { ok: true }
    }
  )

  // パスワードリセット（初期パスワードに戻す）
  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/reset-password',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      const initialPassword = cfg.defaultPassword
      const passwordHash = await app.auth.hashPassword(initialPassword)

      await app.prisma.user.update({
        where: { id: req.params.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          loginFailCount: 0,
          lockedAt: null,
        },
      })

      // 既存セッションを全削除（DB + キャッシュ）
      await app.prisma.session.deleteMany({
        where: { userId: req.params.id },
      })
      await app.auth.clearSessionCacheForUser(req.params.id)

      return { ok: true }
    }
  )
}
