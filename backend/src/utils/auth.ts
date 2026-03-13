import type { FastifyRequest } from 'fastify'
import { Err } from '../types/errors.js'

export interface AuthenticatedUser {
  id: string
  userId: string
  email: string | null
  name?: string | null
  role: string
  imageUrl?: string | null
}

export function requireAuthedUser(req: FastifyRequest): AuthenticatedUser {
  if (!req.user) {
    throw Err.unauthorized()
  }
  return {
    id: req.user.id,
    userId: req.user.userId,
    email: req.user.email,
    name: req.user.name ?? null,
    role: req.user.role,
    imageUrl: req.user.imageUrl ?? null,
  }
}
