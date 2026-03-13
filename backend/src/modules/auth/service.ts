import type { FastifyInstance } from 'fastify'
import argon2 from 'argon2'
import crypto from 'node:crypto'
import type { LoginBody, ChangePasswordBody, SetInitialPasswordBody } from './types.js'
import { Err } from '../../types/errors.js'

const MAX_FAILS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000

let dummyHash: string | null = null
async function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await argon2.hash('dummy-password-for-timing', {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 2 ** 16,
    })
  }
  return dummyHash
}

const userSelect = {
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
} as const

export async function loginUser(app: FastifyInstance, body: LoginBody) {
  const { userId, password } = body

  const user = await app.prisma.user.findUnique({ where: { userId } })

  if (!user) {
    await argon2.verify(await getDummyHash(), password).catch(() => {})
    throw Err.unauthorized('INVALID_CREDENTIALS')
  }

  if (user.status === 'INACTIVE') {
    throw Err.unauthorized('USER_INACTIVE')
  }

  const isLocked = Boolean(user.lockedAt) || (user.loginFailCount ?? 0) >= MAX_FAILS
  if (isLocked) {
    const lockExpired =
      user.lockedAt && Date.now() - user.lockedAt.getTime() >= LOCK_DURATION_MS
    if (lockExpired) {
      await app.prisma.user.update({
        where: { id: user.id },
        data: { loginFailCount: 0, lockedAt: null },
      })
    } else {
      throw Err.unauthorized('USER_LOCKED')
    }
  }

  const ok = await app.auth.verifyPassword(user.passwordHash, password)

  if (!ok) {
    const updated = await app.prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: { increment: 1 } },
      select: { loginFailCount: true },
    })

    if (updated.loginFailCount >= MAX_FAILS) {
      await app.prisma.user.update({
        where: { id: user.id },
        data: { lockedAt: new Date() },
      })
    }

    throw Err.unauthorized('INVALID_CREDENTIALS')
  }

  const updatedUser = await app.prisma.user.update({
    where: { id: user.id },
    data: {
      loginFailCount: 0,
      lockedAt: null,
      lastLoginAt: new Date(),
    },
    select: userSelect,
  })

  const { token, expiresAt } = await app.auth.createSession(updatedUser.id)

  return {
    user: {
      ...updatedUser,
      lastLoginAt: updatedUser.lastLoginAt?.toISOString() ?? null,
    },
    token,
    expiresAt,
  }
}

export async function changePassword(
  app: FastifyInstance,
  userPkId: string,
  body: ChangePasswordBody,
  currentToken?: string
) {
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) throw Err.badRequest('MISSING_FIELDS')
  if (newPassword.length < 8) throw Err.badRequest('PASSWORD_TOO_SHORT')
  if (newPassword === currentPassword) throw Err.badRequest('PASSWORD_SAME_CURRENT')

  const dbUser = await app.prisma.user.findUnique({ where: { id: userPkId } })
  if (!dbUser) throw Err.notFound('USER_NOT_FOUND')

  const ok = await app.auth.verifyPassword(dbUser.passwordHash, currentPassword)
  if (!ok) throw Err.badRequest('INVALID_CURRENT_PASSWORD')

  const passwordHash = await app.auth.hashPassword(newPassword)

  const { token, expiresAt } = await app.prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userPkId },
      data: { passwordHash, mustChangePassword: false, loginFailCount: 0, lockedAt: null },
    })

    await tx.session.deleteMany({
      where: {
        userId: userPkId,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    })

    if (currentToken) {
      await tx.session.deleteMany({ where: { token: currentToken } })
    }

    const newToken = crypto.randomBytes(32).toString('hex')
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await tx.session.create({
      data: { userId: userPkId, token: newToken, expiresAt: newExpiresAt },
    })

    return { token: newToken, expiresAt: newExpiresAt }
  })

  return { token, expiresAt }
}

export async function setInitialPassword(
  app: FastifyInstance,
  userPkId: string,
  body: SetInitialPasswordBody,
  currentToken?: string
) {
  const { newPassword } = body

  if (!newPassword) throw Err.badRequest('MISSING_FIELDS')
  if (newPassword.length < 8) throw Err.badRequest('PASSWORD_TOO_SHORT')

  const dbUser = await app.prisma.user.findUnique({
    where: { id: userPkId },
    select: { mustChangePassword: true },
  })
  if (!dbUser) throw Err.notFound('USER_NOT_FOUND')
  if (!dbUser.mustChangePassword) {
    throw Err.badRequest('INITIAL_PASSWORD_ALREADY_SET')
  }

  const passwordHash = await app.auth.hashPassword(newPassword)

  const { token, expiresAt } = await app.prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userPkId },
      data: { passwordHash, mustChangePassword: false, loginFailCount: 0, lockedAt: null },
    })

    await tx.session.deleteMany({
      where: {
        userId: userPkId,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    })

    if (currentToken) {
      await tx.session.deleteMany({ where: { token: currentToken } })
    }

    const newToken = crypto.randomBytes(32).toString('hex')
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await tx.session.create({
      data: { userId: userPkId, token: newToken, expiresAt: newExpiresAt },
    })

    return { token: newToken, expiresAt: newExpiresAt }
  })

  return { token, expiresAt }
}
