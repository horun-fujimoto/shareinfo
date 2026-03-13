import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import crypto from 'node:crypto'
import argon2 from 'argon2'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '../../prisma/generated/client.js'

type SessionUser = {
  id: string
  userId: string
  email: string | null
  name?: string
  role: Role
  imageUrl?: string | null
}

declare module 'fastify' {
  interface FastifyInstance {
    auth: {
      requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
      requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
      hashPassword: (pw: string) => Promise<string>
      verifyPassword: (hash: string, pw: string) => Promise<boolean>
      createSession: (userPkId: string) => Promise<{ token: string; expiresAt: Date }>
      destroySession: (token: string) => Promise<void>
      clearSessionCacheForUser: (userId: string) => Promise<void>
      getUserFromSession: (req: FastifyRequest) => Promise<SessionUser | null>
    }
  }

  interface FastifyRequest {
    user?: SessionUser
  }
}

const COOKIE_NAME = 'shareinfo.sid'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30日
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000 // 5分
const MAX_SESSIONS_PER_USER = 10

export default fp(async (app: FastifyInstance) => {
  const cookieSecret = process.env.COOKIE_SECRET
  if (!cookieSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('COOKIE_SECRET must be set in production')
    }
    app.log.warn('COOKIE_SECRET is not set — using insecure default (dev only)')
  }

  await app.register(cookie, {
    secret: cookieSecret || 'dev-cookie-secret',
    hook: 'onRequest',
  })

  const prisma = app.prisma

  const sessionCache = new Map<string, { user: SessionUser; expiresAt: number }>()

  async function hashPassword(pw: string) {
    return argon2.hash(pw, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 2 ** 16,
    })
  }

  async function verifyPassword(hash: string, pw: string) {
    return argon2.verify(hash, pw)
  }

  async function createSession(userPkId: string) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

    await prisma.session.create({
      data: { userId: userPkId, token, expiresAt },
    })

    const sessions = await prisma.session.findMany({
      where: { userId: userPkId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, token: true },
    })

    if (sessions.length > MAX_SESSIONS_PER_USER) {
      const toDelete = sessions.slice(0, sessions.length - MAX_SESSIONS_PER_USER)
      const idsToDelete = toDelete.map((s) => s.id)
      for (const s of toDelete) sessionCache.delete(s.token)
      await prisma.session.deleteMany({ where: { id: { in: idsToDelete } } })
    }

    return { token, expiresAt }
  }

  async function destroySession(token: string) {
    sessionCache.delete(token)
    await prisma.session.deleteMany({ where: { token } })
  }

  async function clearSessionCacheForUser(userId: string) {
    // キャッシュ内のそのユーザーのセッションを全削除
    for (const [token, entry] of sessionCache.entries()) {
      if (entry.user.id === userId) {
        sessionCache.delete(token)
      }
    }
  }

  async function getUserFromSession(req: FastifyRequest): Promise<SessionUser | null> {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return null

    const cached = sessionCache.get(token)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user
    }
    sessionCache.delete(token)

    const now = new Date()
    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: now } },
      select: {
        user: {
          select: {
            id: true,
            userId: true,
            email: true,
            name: true,
            role: true,
            imageUrl: true,
          },
        },
      },
    })

    if (!session) return null

    const u = session.user
    const user: SessionUser = {
      id: u.id,
      userId: u.userId,
      email: u.email,
      name: u.name || undefined,
      role: u.role,
      imageUrl: u.imageUrl,
    }

    sessionCache.set(token, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS })

    return user
  }

  async function requireUser(req: FastifyRequest, reply: FastifyReply) {
    const user = await getUserFromSession(req)
    if (!user) {
      reply.code(401).send({ ok: false, error: 'unauthorized', code: 'UNAUTHORIZED' })
      return
    }
    req.user = user
  }

  async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
    const user = await getUserFromSession(req)
    if (!user) {
      reply.code(401).send({ ok: false, error: 'unauthorized', code: 'UNAUTHORIZED' })
      return
    }
    if (user.role !== 'ADMIN') {
      reply.code(403).send({ ok: false, error: 'forbidden', code: 'FORBIDDEN' })
      return
    }
    req.user = user
  }

  app.decorate('auth', {
    requireUser,
    requireAdmin,
    hashPassword,
    verifyPassword,
    createSession,
    destroySession,
    clearSessionCacheForUser,
    getUserFromSession,
  })

  app.log.info('Auth plugin initialized')
})
