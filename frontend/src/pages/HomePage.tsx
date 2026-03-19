import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client.ts'
import type { ArticleSummary } from '../types/index.ts'
import UserAvatar from '../components/atoms/UserAvatar.tsx'
import Pagination from '../components/molecules/Pagination.tsx'
import dayjs from 'dayjs'

const PAGE_SIZE = 10

export default function HomePage() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchArticles = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch<{
        ok: boolean
        articles: ArticleSummary[]
        total: number
      }>(`/articles?page=${p}&pageSize=${PAGE_SIZE}&sort=latest`)
      setArticles(res.articles)
      setTotal(res.total)
      setPage(p)
    } catch {
      setError('記事の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles(1)
  }, [fetchArticles])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">新着記事</h1>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
      ) : error ? (
        <div className="si-card text-center" style={{ padding: '3rem', color: '#d32f2f' }}>
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          まだ記事がありません。最初の記事を投稿してみましょう！
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {articles.map((article) => (
              <div
                key={article.id}
                className="article-card"
                onClick={() => navigate(`/articles/${article.id}`)}
              >
                <div className="article-card__tags">
                  {article.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="article-tag"
                      style={{
                        backgroundColor: `${tag.color}18`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <h3 className="article-card__title">{article.title}</h3>

                <div className="article-card__meta">
                  <span
                    className="article-card__author"
                    onClick={(e) => { e.stopPropagation(); navigate(`/users/${article.author.id}`) }}
                  >
                    <UserAvatar
                      name={article.author.name}
                      imageUrl={article.author.imageUrl}
                      size={20}
                    />
                    {article.author.name}
                  </span>
                  <span>{article.publishedAt ? dayjs(article.publishedAt).format('YYYY/MM/DD HH:mm') : ''}</span>
                  <span>&#x2764; {article.likeCount}</span>
                  <span>&#x1F4AC; {article.commentCount}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={fetchArticles} />
          )}
        </>
      )}
    </div>
  )
}
