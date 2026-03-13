import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client.ts'
import type { ArticleSummary } from '../types/index.ts'
import UserAvatar from '../components/atoms/UserAvatar.tsx'
import Pagination from '../components/molecules/Pagination.tsx'
import dayjs from 'dayjs'

const PAGE_SIZE = 10

export default function PopularPage() {
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
      }>(`/articles?page=${p}&pageSize=${PAGE_SIZE}&sort=popular`)
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
  const rankOffset = (page - 1) * PAGE_SIZE

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">人気記事</h1>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
      ) : error ? (
        <div className="si-card text-center" style={{ padding: '3rem', color: '#d32f2f' }}>
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          まだ記事がありません。
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {articles.map((article, idx) => {
              const rank = rankOffset + idx + 1
              return (
                <div
                  key={article.id}
                  className="article-card"
                  onClick={() => navigate(`/articles/${article.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: rank <= 3 ? '#e91e8c' : '#9e9e9e',
                      minWidth: '28px',
                    }}>
                      #{rank}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="article-card__tags">
                        {article.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="article-tag"
                            style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      <h3 className="article-card__title" style={{ margin: 0 }}>{article.title}</h3>
                    </div>
                  </div>

                  <div className="article-card__meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <UserAvatar name={article.author.name} imageUrl={article.author.imageUrl} size={20} />
                      {article.author.name}
                    </span>
                    <span>{article.publishedAt ? dayjs(article.publishedAt).format('YYYY/MM/DD') : ''}</span>
                    <span>&#x2764; {article.likeCount}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={fetchArticles} />
          )}
        </>
      )}
    </div>
  )
}
