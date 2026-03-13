import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from './plugins/prisma.js'
import auth from './plugins/auth.js'
import errorHandler from './plugins/error-handler.js'
import authRoutes from './modules/auth/routes.js'
import articleRoutes from './modules/articles/routes.js'
import commentRoutes from './modules/comments/routes.js'
import likeRoutes from './modules/likes/routes.js'
import bookmarkRoutes from './modules/bookmarks/routes.js'
import tagRoutes from './modules/tags/routes.js'
import documentRoutes from './modules/documents/routes.js'
import notificationRoutes from './modules/notifications/routes.js'
import adminUserRoutes from './modules/admin/users/routes.js'
import viewHistoryRoutes from './modules/view-history/routes.js'
import uploadRoutes from './modules/upload/routes.js'
import settingsRoutes from './modules/settings/routes.js'
import { cfg } from './config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function buildApp() {
  const app = Fastify({ logger: true })

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)

  await app.register(errorHandler)

  // グローバルレート制限
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    try {
      const json = body ? JSON.parse(body) : {}
      done(null, json)
    } catch (e: unknown) {
      done(e as Error, undefined)
    }
  })

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  })

  await app.register(multipart, {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  })

  // 静的ファイル配信（uploads/）
  const uploadsPath = path.resolve(__dirname, '..', cfg.uploadDir)
  await app.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
  })

  await app.register(prisma)
  await app.register(auth)

  // Routes
  await app.register(authRoutes)
  await app.register(articleRoutes)
  await app.register(commentRoutes)
  await app.register(likeRoutes)
  await app.register(bookmarkRoutes)
  await app.register(tagRoutes)
  await app.register(documentRoutes)
  await app.register(notificationRoutes)
  await app.register(adminUserRoutes)
  await app.register(viewHistoryRoutes)
  await app.register(uploadRoutes)
  await app.register(settingsRoutes)

  app.get('/', async () => ({ ok: true, service: 'shareinfo-backend', time: new Date().toISOString() }))
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
