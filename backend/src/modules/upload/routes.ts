import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { cfg } from '../../config/index.js'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.mp4', '.webm',
  '.pdf', '.zip',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv',
])

function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

function isSafePath(uploadDir: string, filePath: string): boolean {
  const resolved = path.resolve(filePath)
  const resolvedDir = path.resolve(uploadDir)
  return resolved.startsWith(resolvedDir)
}

export default async function uploadRoutes(app: FastifyInstance) {
  // ファイルアップロード
  app.post('/upload', { preHandler: app.auth.requireUser }, async (req) => {
    requireAuthedUser(req)

    const data = await req.file()
    if (!data) throw Err.badRequest('NO_FILE')

    const mimeType = data.mimetype
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw Err.badRequest('INVALID_FILE_TYPE')
    }
    if (!isAllowedExtension(data.filename)) {
      throw Err.badRequest('INVALID_FILE_EXTENSION')
    }

    // ファイル保存
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uploadDir = path.join(cfg.uploadDir, dateDir)
    fs.mkdirSync(uploadDir, { recursive: true })

    const ext = path.extname(data.filename).toLowerCase()
    const uniqueName = `${crypto.randomUUID()}${ext}`
    const filePath = path.join(uploadDir, uniqueName)

    // パストラバーサル防止
    if (!isSafePath(cfg.uploadDir, filePath)) {
      throw Err.badRequest('INVALID_FILE_PATH')
    }

    const chunks: Buffer[] = []
    let totalSize = 0

    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE) {
        throw Err.badRequest('FILE_TOO_LARGE')
      }
      chunks.push(chunk)
    }

    fs.writeFileSync(filePath, Buffer.concat(chunks))

    // 相対パスを返す（URLに使うのでスラッシュ区切りに統一）
    const relativePath = `${dateDir}/${uniqueName}`

    return {
      ok: true,
      file: {
        fileName: data.filename,
        filePath: relativePath,
        fileSize: totalSize,
        mimeType,
        url: `/uploads/${relativePath}`,
      },
    }
  })

  // 複数ファイルアップロード
  app.post('/upload/multiple', { preHandler: app.auth.requireUser }, async (req) => {
    requireAuthedUser(req)

    const parts = req.files()
    const results = []

    for await (const data of parts) {
      const mimeType = data.mimetype
      if (!ALLOWED_MIME_TYPES.includes(mimeType) || !isAllowedExtension(data.filename)) {
        continue // スキップ
      }

      const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const uploadDir = path.join(cfg.uploadDir, dateDir)
      fs.mkdirSync(uploadDir, { recursive: true })

      const ext = path.extname(data.filename).toLowerCase()
      const uniqueName = `${crypto.randomUUID()}${ext}`
      const filePath = path.join(uploadDir, uniqueName)

      // パストラバーサル防止
      if (!isSafePath(cfg.uploadDir, filePath)) continue

      const chunks: Buffer[] = []
      let totalSize = 0

      for await (const chunk of data.file) {
        totalSize += chunk.length
        if (totalSize > MAX_FILE_SIZE) break
        chunks.push(chunk)
      }

      if (totalSize <= MAX_FILE_SIZE) {
        fs.writeFileSync(filePath, Buffer.concat(chunks))
        const relativePath = `${dateDir}/${uniqueName}`

        results.push({
          fileName: data.filename,
          filePath: relativePath,
          fileSize: totalSize,
          mimeType,
          url: `/uploads/${relativePath}`,
        })
      }
    }

    return { ok: true, files: results }
  })
}
