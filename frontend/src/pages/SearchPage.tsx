import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()

  // URLからの状態復元
  const urlKeyword = searchParams.get('keyword') || ''
  const urlTag = searchParams.get('tag') || ''
  const urlPage = Math.max(1, Number(searchParams.get('page')) || 1)
  const hasSearched = searchParams.has('keyword') || searchParams.has('tag')

  const [keyword, setKeyword] = useState(urlKeyword)
  const [selectedTag, setSelectedTag] = useState(urlTag)
  const [tags, setTags] = useState<Tag[]>([])
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiFetch<{ ok: boolean; tags: Tag[] }>('/tags')
      .then((res) => setTags(res.tags))
      .catch(() => {})
  }, [])

  // URL変更時にAPIフェッチ
  const fetchResults = useCallback(async () => {
    if (!hasSearched) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(urlPage))
    params.set('pageSize', '10')
    if (urlKeyword) params.set('keyword', urlKeyword)
    if (urlTag) params.set('tag', urlTag)

    try {
      const res = await apiFetch<{
        ok: boolean
        articles: ArticleSummary[]
        total: number
      }>(`/articles?${params}`)
      setArticles(res.articles)
      setTotal(res.total)
    } catch {
      setArticles([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [urlKeyword, urlTag, urlPage, hasSearched])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  // URLパラメータ同期（入力フィールドの値をURLに反映しない→検索ボタン押下時のみ反映）
  const handleSearch = (p = 1) => {
    const params: Record<string, string> = {}
    if (keyword.trim()) params.keyword = keyword.trim()
    if (selectedTag) params.tag = selectedTag
    if (p > 1) params.page = String(p)
    setSearchParams(params)
  }

  const handlePageChange = (p: number) => {
    const params: Record<string, string> = {}
    if (urlKeyword) params.keyword = urlKeyword
    if (urlTag) params.tag = urlTag
    if (p > 1) params.page = String(p)
    setSearchParams(params)
  }

  // URLパラメータが変わったら入力フィールドも同期（戻る時）
  useEffect(() => {
    setKeyword(urlKeyword)
    setSelectedTag(urlTag)
  }, [urlKeyword, urlTag])

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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
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

          <Button onClick={() => handleSearch(1)}>検索</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>検索中...</div>
      ) : hasSearched ? (
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
                  onClick={() => navigate(`/articles/${article.id}`, { state: { fromLabel: '検索結果に戻る' } })}
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
                    <span
                      className="article-card__author"
                      onClick={(e) => { e.stopPropagation(); navigate(`/users/${article.author.id}`) }}
                    >
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
            <Pagination page={urlPage} pageSize={10} total={total} onPageChange={handlePageChange} />
          )}
        </>
      ) : null}
    </div>
  )
}
