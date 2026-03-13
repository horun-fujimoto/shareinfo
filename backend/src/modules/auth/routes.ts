import type { FastifyInstance, FastifyRequest } from 'fastify'
import { loginUser, changePassword, setInitialPassword } from './service.js'
import type { LoginBody, ChangePasswordBody, SetInitialPasswordBody } from './types.js'
import { Err } from '../../types/errors.js'
import { requireAuthedUser } from '../../utils/auth.js'
import { validate, loginSchema, changePasswordSchema, setInitialPasswordSchema, updateProfileSchema } from '../../utils/validation.js'

const COOKIE_NAME = 'shareinfo.sid'

function getCookieOptions(expires: Date) {
  const isProduction = process.env.NODE_ENV === 'production'
  const secure = isProduction || process.env.COOKIE_SECURE === 'true'
  const sameSite = isProduction
    ? 'strict'
    : ((process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax')
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === 'none' ? true : secure,
    path: '/',
    expires,
  }
}

export default async function authRoutes(app: FastifyInstance) {
  // Login
  app.post<{ Body: LoginBody }>('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = validate(loginSchema, req.body)

    const { user, token, expiresAt } = await loginUser(app, body)

    reply.setCookie(COOKIE_NAME, token, getCookieOptions(expiresAt))

    return { ok: true, user }
  })

  // Me
  app.get('/auth/me', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)

    const user = await app.prisma.user.findUnique({
      where: { id: authedUser.id },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        bio: true,
        role: true,
        status: true,
        imageUrl: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
    })
    if (!user) throw Err.unauthorized('USER_NOT_FOUND')

    return {
      ok: true,
      user: {
        ...user,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
    }
  })

  // Logout
  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies?.[COOKIE_NAME] || ''
    if (token) await app.auth.destroySession(token)
    reply.clearCookie(COOKIE_NAME, { path: '/' })
    return { ok: true }
  })

  // Update profile
  app.patch('/auth/me', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const { name, bio } = validate(updateProfileSchema, req.body)

    const user = await app.prisma.user.update({
      where: { id: authedUser.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(bio !== undefined ? { bio } : {}),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        bio: true,
        role: true,
        imageUrl: true,
      },
    })

    return { ok: true, user }
  })

  // Change password
  app.post<{ Body: ChangePasswordBody }>(
    '/auth/change-password',
    { preHandler: app.auth.requireUser },
    async (req, reply) => {
      const authedUser = requireAuthedUser(req)
      const { token, expiresAt } = await changePassword(
        app,
        authedUser.id,
        req.body,
        req.cookies?.[COOKIE_NAME]
      )
      reply.setCookie(COOKIE_NAME, token, getCookieOptions(expiresAt))
      return { ok: true }
    }
  )

  // Set initial password
  app.post<{ Body: SetInitialPasswordBody }>(
    '/auth/set-initial-password',
    { preHandler: app.auth.requireUser },
    async (req, reply) => {
      const authedUser = requireAuthedUser(req)
      const { token, expiresAt } = await setInitialPassword(
        app,
        authedUser.id,
        req.body,
        req.cookies?.[COOKIE_NAME]
      )
      reply.setCookie(COOKIE_NAME, token, getCookieOptions(expiresAt))
      return { ok: true }
    }
  )
}
