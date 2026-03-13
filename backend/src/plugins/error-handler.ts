import fp from 'fastify-plugin'
import type { FastifyError } from 'fastify'
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library'

import { AppError } from '../types/errors.js'

function isFastifyError(err: unknown): err is FastifyError {
  return typeof err === 'object' && err !== null && 'message' in err
}

function hasStatusCode(
  err: FastifyError
): err is FastifyError & { statusCode: number; code?: string } {
  const e = err as FastifyError & { statusCode?: unknown }
  return typeof e.statusCode === 'number'
}

export default fp(async (app) => {
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ ok: false, error: 'not found', code: 'NOT_FOUND' })
  })

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof AppError) {
      const payload: { ok: false; error: string; code: string; errorMessages?: string[] } = {
        ok: false,
        error: err.message,
        code: err.code,
      }
      if (Array.isArray(err.detail)) {
        payload.errorMessages = err.detail as string[]
      }
      return reply.code(err.status).send(payload)
    }

    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return reply.code(409).send({ ok: false, error: 'conflict', code: 'CONFLICT' })
      }
      if (err.code === 'P2025') {
        return reply.code(404).send({ ok: false, error: 'not found', code: 'NOT_FOUND' })
      }
      app.log.warn({ prismaCode: err.code, meta: err.meta }, 'unhandled prisma request error')
      return reply.code(400).send({ ok: false, error: 'bad request', code: 'BAD_REQUEST' })
    }

    if (err instanceof PrismaClientValidationError) {
      app.log.warn({ err }, 'prisma validation error')
      return reply
        .code(400)
        .send({ ok: false, error: 'bad request', code: 'BAD_REQUEST' })
    }

    if (err instanceof PrismaClientInitializationError) {
      app.log.error({ err }, 'prisma initialization error')
      return reply.code(500).send({ ok: false, error: 'internal error', code: 'INTERNAL' })
    }

    if (isFastifyError(err) && hasStatusCode(err)) {
      return reply.code(err.statusCode).send({
        ok: false,
        error: err.message,
        code: err.code ?? 'FASTIFY_ERROR',
      })
    }

    app.log.error({ err }, 'unhandled error')
    return reply.code(500).send({ ok: false, error: 'internal error', code: 'INTERNAL' })
  })
})
