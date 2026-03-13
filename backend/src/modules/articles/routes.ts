import type { FastifyInstance } from 'fastify'
import { requireAuthedUser } from '../../utils/auth.js'
import { Err } from '../../types/errors.js'
import { validate, createArticleSchema, updateArticleSchema } from '../../utils/validation.js'

export default async function articleRoutes(app: FastifyInstance) {
  // 記事一覧（公開記事のみ）
  app.get<{
    Querystring: {
      page?: string
      pageSize?: string
      sort?: string
      tag?: string
      keyword?: string
      authorId?: string
    }
  }>('/articles', { preHandler: app.auth.requireUser }, async (req) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
    const skip = (page - 1) * pageSize
    const sort = req.query.sort || 'latest'
    const tag = req.query.tag
    const keyword = req.query.keyword
    const authorId = req.query.authorId

    const where: Record<string, unknown> = { status: 'PUBLISHED' }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } }
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (authorId) {
      where.authorId = authorId
    }

    const orderBy =
      sort === 'popular'
        ? { likeCount: 'desc' as const }
        : { publishedAt: 'desc' as const }

    const [articles, total] = await Promise.all([
      app.prisma.article.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          likeCount: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, userId: true, name: true, imageUrl: true },
          },
          tags: {
            select: { tag: { select: { id: true, name: true, color: true } } },
          },
          _count: { select: { comments: true } },
        },
      }),
      app.prisma.article.count({ where }),
    ])

    return {
      ok: true,
      articles: articles.map((a) => ({
        ...a,
        content: a.content.substring(0, 200),
        tags: a.tags.map((t) => t.tag),
        commentCount: a._count.comments,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  })

  // 新着記事（最新10件）
  app.get('/articles/recent', { preHandler: app.auth.requireUser }, async () => {
    const articles = await app.prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        author: {
          select: { id: true, name: true, imageUrl: true },
        },
        tags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    return {
      ok: true,
      articles: articles.map((a) => ({
        ...a,
        tags: a.tags.map((t) => t.tag),
        publishedAt: a.publishedAt?.toISOString() ?? null,
      })),
    }
  })

  // 人気記事（いいね上位10件）
  app.get('/articles/popular', { preHandler: app.auth.requireUser }, async () => {
    const articles = await app.prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { likeCount: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        likeCount: true,
        publishedAt: true,
        author: {
          select: { id: true, name: true, imageUrl: true },
        },
        tags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    return {
      ok: true,
      articles: articles.map((a) => ({
        ...a,
        tags: a.tags.map((t) => t.tag),
        publishedAt: a.publishedAt?.toISOString() ?? null,
      })),
    }
  })

  // 記事詳細
  app.get<{ Params: { id: string } }>(
    '/articles/:id',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const article = await app.prisma.article.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          likeCount: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          authorId: true,
          author: {
            select: { id: true, userId: true, name: true, imageUrl: true },
          },
          tags: {
            select: { tag: { select: { id: true, name: true, color: true } } },
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
          _count: { select: { comments: true, likes: true } },
        },
      })

      if (!article) throw Err.notFound('ARTICLE_NOT_FOUND')

      // 非公開記事は著者のみ閲覧可
      if (article.status !== 'PUBLISHED' && article.authorId !== authedUser.id) {
        throw Err.notFound('ARTICLE_NOT_FOUND')
      }

      // 閲覧履歴を記録 & 閲覧数を増加（トランザクション）
      await app.prisma.$transaction([
        app.prisma.viewHistory.upsert({
          where: {
            articleId_userId: { articleId: article.id, userId: authedUser.id },
          },
          create: { articleId: article.id, userId: authedUser.id },
          update: { viewedAt: new Date() },
        }),
        app.prisma.article.update({
          where: { id: article.id },
          data: { viewCount: { increment: 1 } },
        }),
      ])

      // いいね・ブックマーク状態を確認
      const [liked, bookmarked] = await Promise.all([
        app.prisma.like.findUnique({
          where: { articleId_userId: { articleId: article.id, userId: authedUser.id } },
        }),
        app.prisma.bookmark.findUnique({
          where: { articleId_userId: { articleId: article.id, userId: authedUser.id } },
        }),
      ])

      return {
        ok: true,
        article: {
          ...article,
          tags: article.tags.map((t) => t.tag),
          commentCount: article._count.comments,
          isLiked: !!liked,
          isBookmarked: !!bookmarked,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          createdAt: article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString(),
        },
      }
    }
  )

  // 記事作成
  app.post<{
    Body: { title: string; content: string; status?: string; tagIds?: string[] }
  }>('/articles', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const { title, content, status, tagIds } = validate(createArticleSchema, req.body)

    const articleStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

    const article = await app.prisma.article.create({
      data: {
        title: title.trim(),
        content: content || '',
        status: articleStatus,
        authorId: authedUser.id,
        publishedAt: articleStatus === 'PUBLISHED' ? new Date() : null,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    })

    return { ok: true, article }
  })

  // 記事更新
  app.patch<{
    Params: { id: string }
    Body: { title?: string; content?: string; status?: string; tagIds?: string[] }
  }>('/articles/:id', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const existing = await app.prisma.article.findUnique({
      where: { id: req.params.id },
      select: { authorId: true, status: true },
    })

    if (!existing) throw Err.notFound('ARTICLE_NOT_FOUND')
    if (existing.authorId !== authedUser.id) throw Err.forbidden('NOT_AUTHOR')

    const { title, content, status, tagIds } = validate(updateArticleSchema, req.body)

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (content !== undefined) data.content = content
    if (status !== undefined) {
      data.status = status
      if (status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        data.publishedAt = new Date()
      }
    }

    // タグの更新
    if (tagIds !== undefined) {
      await app.prisma.articleTag.deleteMany({ where: { articleId: req.params.id } })
      if (tagIds.length > 0) {
        await app.prisma.articleTag.createMany({
          data: tagIds.map((tagId) => ({ articleId: req.params.id, tagId })),
        })
      }
    }

    const article = await app.prisma.article.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    })

    return { ok: true, article }
  })

  // 記事削除
  app.delete<{ Params: { id: string } }>(
    '/articles/:id',
    { preHandler: app.auth.requireUser },
    async (req) => {
      const authedUser = requireAuthedUser(req)
      const existing = await app.prisma.article.findUnique({
        where: { id: req.params.id },
        select: { authorId: true },
      })

      if (!existing) throw Err.notFound('ARTICLE_NOT_FOUND')
      if (existing.authorId !== authedUser.id && req.user?.role !== 'ADMIN') {
        throw Err.forbidden('NOT_AUTHOR')
      }

      await app.prisma.article.delete({ where: { id: req.params.id } })

      return { ok: true }
    }
  )

  // 自分の記事一覧（下書き含む）
  app.get<{
    Querystring: { page?: string; pageSize?: string }
  }>('/articles/my', { preHandler: app.auth.requireUser }, async (req) => {
    const authedUser = requireAuthedUser(req)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10))
    const skip = (page - 1) * pageSize

    const [articles, total] = await Promise.all([
      app.prisma.article.findMany({
        where: { authorId: authedUser.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          status: true,
          likeCount: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          tags: {
            select: { tag: { select: { id: true, name: true, color: true } } },
          },
          _count: { select: { comments: true } },
        },
      }),
      app.prisma.article.count({ where: { authorId: authedUser.id } }),
    ])

    return {
      ok: true,
      articles: articles.map((a) => ({
        ...a,
        tags: a.tags.map((t) => t.tag),
        commentCount: a._count.comments,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  })
}
