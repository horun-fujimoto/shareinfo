import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client.ts'
import type { ArticleSummary } from '../../types/index.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import UserAvatar from '../../components/atoms/UserAvatar.tsx'
import Pagination from '../../components/molecules/Pagination.tsx'
import dayjs from 'dayjs'

type UserProfile = {
  id: string
  userId: string
  name: string
  bio: string | null
  imageUrl: string | null
  createdAt: string
  articleCount: number
}

const PAGE_SIZE = 10

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // 自分のプロフィールならマイページにリダイレクト
  useEffect(() => {
    if (id && currentUser && id === currentUser.id) {
      navigate('/mypage', { replace: true })
    }
  }, [id, currentUser, navigate])

  useEffect(() => {
    if (!id) return
    apiFetch<{ ok: boolean; user: UserProfile }>(`/users/${id}`)
      .then((res) => setProfile(res.user))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const fetchArticles = useCallback(async (p = 1) => {
    if (!id) return
    try {
      const res = await apiFetch<{
        ok: boolean
        articles: ArticleSummary[]
        total: number
      }>(`/articles?page=${p}&pageSize=${PAGE_SIZE}&authorId=${id}`)
      setArticles(res.articles)
      setTotal(res.total)
      setPage(p)
    } catch { /* ignore */ }
  }, [id])

  useEffect(() => {
    fetchArticles(1)
  }, [fetchArticles])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  if (!profile) return null

  return (
    <div>
      {/* プロフィールヘッダー */}
      <div className="si-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <UserAvatar name={profile.name} imageUrl={profile.imageUrl} size={64} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{profile.name}</h1>
            <div style={{ fontSize: '12px', color: '#9e9e9e', marginTop: '0.2rem' }}>
              @{profile.userId} / {dayjs(profile.createdAt).format('YYYY/MM/DD')} 登録
            </div>
            {profile.bio && (
              <p style={{ fontSize: '13px', color: '#616161', marginTop: '0.5rem', marginBottom: 0 }}>
                {profile.bio}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#e88da8' }}>{profile.articleCount}</div>
            <div style={{ fontSize: '11px', color: '#9e9e9e' }}>投稿記事</div>
          </div>
        </div>
      </div>

      {/* 投稿記事一覧 */}
      <div className="page-header">
        <h2 className="page-header__title">{profile.name} の記事</h2>
      </div>

      {articles.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          まだ公開記事がありません。
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
                      style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <h3 className="article-card__title">{article.title}</h3>
                <div className="article-card__meta">
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
