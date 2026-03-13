import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client.ts'
import type { ArticleSummary, Tag } from '../types/index.ts'
import UserAvatar from '../components/atoms/UserAvatar.tsx'
import Pagination from '../components/molecules/Pagination.tsx'
import Button from '../components/atoms/Button.tsx'
import dayjs from 'dayjs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

export default function SearchPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    apiFetch<{ ok: boolean; tags: Tag[] }>('/tags')
      .then((res) => setTags(res.tags))
      .catch(() => { /* タグ取得失敗は非致命的 */ })
  }, [])

  const search = useCallback(async (p = 1) => {
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('pageSize', '10')
    if (keyword.trim()) params.set('keyword', keyword.trim())
    if (selectedTag) params.set('tag', selectedTag)

    try {
      const res = await apiFetch<{
        ok: boolean
        articles: ArticleSummary[]
        total: number
      }>(`/articles?${params}`)
      setArticles(res.articles)
      setTotal(res.total)
      setPage(p)
    } catch {
      setArticles([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [keyword, selectedTag])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">記事検索</h1>
      </div>

      <div className="si-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              キーワード
            </label>
            <div className="si-search">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="si-search__icon" />
              <input
                className="si-search__input"
                placeholder="タイトル・本文を検索..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search(1)}
              />
            </div>
          </div>

          <div style={{ minWidth: '150px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              タグ
            </label>
            <select
              className="si-form-field__select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">すべて</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <Button onClick={() => search(1)}>検索</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>検索中...</div>
      ) : searched ? (
        <>
          <div style={{ fontSize: '13px', color: '#616161', marginBottom: '0.5rem' }}>
            {total}件の記事が見つかりました
          </div>

          {articles.length === 0 ? (
            <div className="si-card text-center" style={{ padding: '3rem' }}>
              該当する記事がありません。
            </div>
          ) : (
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
                        style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <h3 className="article-card__title">{article.title}</h3>
                  <div className="article-card__meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <UserAvatar name={article.author.name} imageUrl={article.author.imageUrl} size={20} />
                      {article.author.name}
                    </span>
                    <span>{article.publishedAt ? dayjs(article.publishedAt).format('YYYY/MM/DD') : ''}</span>
                    <span>&#x2764; {article.likeCount}</span>
                    <span>&#x1F4AC; {article.commentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > 10 && (
            <Pagination page={page} pageSize={10} total={total} onPageChange={search} />
          )}
        </>
      ) : null}
    </div>
  )
}
