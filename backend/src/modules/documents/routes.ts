import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'
import { validate, createDocumentSchema, updateDocumentSchema } from '../../utils/validation.js'
import { cfg } from '../../config/index.js'
import fs from 'node:fs'
import path from 'node:path'

export default async function documentRoutes(app: FastifyInstance) {
  // ドキュメント一覧（公開のみ）
  app.get('/documents', { preHandler: app.auth.requireUser }, async () => {
    const documents = await app.prisma.document.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, imageUrl: true },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            fileSize: true,
            mimeType: true,
            isInlineImage: true,
          },
        },
      },
    })

    return {
      ok: true,
      documents: documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    }
  })

  // ドキュメント詳細
  app.get<{ Params: { id: string } }>(
    '/documents/:id',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const document = await app.prisma.document.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          title: true,
          content: true,
          sortOrder: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, imageUrl: true },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              filePath: true,
              fileSize: true,
              mimeType: true,
              isInlineImage: true,
            },
          },
        },
      })

      if (!document) throw Err.notFound('DOCUMENT_NOT_FOUND')
      if (!document.published && req.user?.role !== 'ADMIN') {
        throw Err.notFound('DOCUMENT_NOT_FOUND')
      }

      return {
        ok: true,
        document: {
          ...document,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
        },
      }
    }
  )

  // ドキュメント作成（管理者のみ）
  app.post<{
    Body: { title: string; content: string; published?: boolean }
  }>('/admin/documents', { preHandler: app.auth.requireAdmin }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const { title, content, published } = validate(createDocumentSchema, req.body)

    const document = await app.prisma.document.create({
      data: {
        title: title.trim(),
        content: content || '',
        published: published ?? false,
        authorId: authedUser.id,
      },
    })

    return { ok: true, document }
  })

  // ドキュメント更新（管理者のみ）
  app.patch<{
    Params: { id: string }
    Body: { title?: string; content?: string; published?: boolean; sortOrder?: number }
  }>('/admin/documents/:id', { preHandler: app.auth.requireAdmin }, async (req) => {
    const { title, content, published, sortOrder } = validate(updateDocumentSchema, req.body)

    const document = await app.prisma.document.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    })

    return { ok: true, document }
  })

  // ドキュメント削除（管理者のみ）
  app.delete<{ Params: { id: string } }>(
    '/admin/documents/:id',
    { preHandler: app.auth.requireAdmin },
    async (req) => {
      // 添付ファイルを取得してからドキュメント削除
      const doc = await app.prisma.document.findUnique({
        where: { id: req.params.id },
        select: { attachments: { select: { filePath: true } } },
      })
      await app.prisma.document.delete({ where: { id: req.params.id } })

      // ファイルシステムからも削除
      if (doc?.attachments) {
        for (const att of doc.attachments) {
          const fullPath = path.join(cfg.uploadDir, att.filePath)
          try { fs.unlinkSync(fullPath) } catch { /* ファイル不在は無視 */ }
        }
      }

      return { ok: true }
    }
  )

  // 管理者用：全ドキュメント一覧（非公開含む）
  app.get('/admin/documents', { preHandler: app.auth.requireAdmin }, async () => {
    const documents = await app.prisma.document.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        published: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true },
        },
      },
    })

    return {
      ok: true,
      documents: documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    }
  })
}
