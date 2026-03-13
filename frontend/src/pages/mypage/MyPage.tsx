import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client.ts'
import type { ArticleSummary } from '../../types/index.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import UserAvatar from '../../components/atoms/UserAvatar.tsx'
import Button from '../../components/atoms/Button.tsx'
import Badge from '../../components/atoms/Badge.tsx'
import dayjs from 'dayjs'

type Tab = 'liked' | 'bookmarked' | 'viewed' | 'my'

export default function MyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('my')
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async (tab: Tab, p = 1) => {
    setLoading(true)
    try {
      const params = `?page=${p}&pageSize=10`

      if (tab === 'liked') {
        const res = await apiFetch<{
          ok: boolean
          likes: { article: ArticleSummary }[]
          total: number
        }>(`/liked-articles${params}`)
        setArticles(res.likes.map((l) => l.article))
        setTotal(res.total)
      } else if (tab === 'bookmarked') {
        const res = await apiFetch<{
          ok: boolean
          bookmarks: { article: ArticleSummary }[]
          total: number
        }>(`/bookmarks${params}`)
        setArticles(res.bookmarks.map((b) => b.article))
        setTotal(res.total)
      } else if (tab === 'viewed') {
        const res = await apiFetch<{
          ok: boolean
          histories: { article: ArticleSummary }[]
          total: number
        }>(`/view-history${params}`)
        setArticles(res.histories.map((h) => h.article))
        setTotal(res.total)
      } else {
        const res = await apiFetch<{
          ok: boolean
          articles: ArticleSummary[]
          total: number
        }>(`/articles/my${params}`)
        setArticles(res.articles)
        setTotal(res.total)
      }
      setPage(p)
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab, 1)
  }, [activeTab, fetchData])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
  }

  const handleDelete = async (articleId: string) => {
    if (!confirm('この記事を削除しますか？')) return
    await apiFetch(`/articles/${articleId}`, { method: 'DELETE' })
    fetchData(activeTab, page)
  }

  const handleToggleVisibility = async (articleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'PRIVATE' : 'PUBLISHED'
    await apiFetch(`/articles/${articleId}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    fetchData(activeTab, page)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'my', label: '自分の記事' },
    { key: 'liked', label: 'いいね' },
    { key: 'bookmarked', label: 'ブックマーク' },
    { key: 'viewed', label: '閲覧履歴' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">マイページ</h1>
      </div>

      {/* ユーザー情報 */}
      {user && (
        <div className="si-card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <UserAvatar name={user.name} imageUrl={user.imageUrl} size={56} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '13px', color: '#616161' }}>@{user.userId}</div>
            {user.bio && <div style={{ fontSize: '13px', marginTop: '0.3rem' }}>{user.bio}</div>}
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="si-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`si-tabs__tab${activeTab === tab.key ? ' si-tabs__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
      ) : articles.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          記事がありません。
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {articles.map((article) => (
              <div
                key={article.id}
                className="article-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => navigate(`/articles/${article.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{article.title}</span>
                    {activeTab === 'my' && (
                      <Badge variant={article.status === 'PUBLISHED' ? 'success' : article.status === 'DRAFT' ? 'secondary' : 'warning'}>
                        {article.status === 'PUBLISHED' ? '公開' : article.status === 'DRAFT' ? '下書き' : '非公開'}
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
                    {article.publishedAt ? dayjs(article.publishedAt).format('YYYY/MM/DD') : dayjs(article.createdAt).format('YYYY/MM/DD')}
                    {' | '} &#x2764; {article.likeCount}
                  </div>
                </div>

                {activeTab === 'my' && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/articles/${article.id}/edit`)
                      }}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleVisibility(article.id, article.status)
                      }}
                    >
                      {article.status === 'PUBLISHED' ? '非公開' : '公開'}
                    </Button>
                    <Button
                      variant="outline-error"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(article.id)
                      }}
                    >
                      削除
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {total > 10 && (
            <div className="si-pagination" style={{ marginTop: '1rem' }}>
              <button className="si-pagination__btn" disabled={page <= 1} onClick={() => fetchData(activeTab, page - 1)}>
                前へ
              </button>
              <span style={{ fontSize: '13px' }}>{page} / {Math.ceil(total / 10)}</span>
              <button className="si-pagination__btn" disabled={page >= Math.ceil(total / 10)} onClick={() => fetchData(activeTab, page + 1)}>
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
