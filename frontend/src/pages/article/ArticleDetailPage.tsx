import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client.ts'
import type { ArticleDetail, Comment as CommentType } from '../../types/index.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { sanitizeHtml } from '../../utils/sanitize.ts'
import UserAvatar from '../../components/atoms/UserAvatar.tsx'
import Button from '../../components/atoms/Button.tsx'
import dayjs from 'dayjs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faBookmark, faTrash } from '@fortawesome/free-solid-svg-icons'

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchArticle = useCallback(async () => {
    if (!id) return
    try {
      const res = await apiFetch<{ ok: boolean; article: ArticleDetail }>(`/articles/${id}`)
      setArticle(res.article)
    } catch {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const fetchComments = useCallback(async () => {
    if (!id) return
    try {
      const res = await apiFetch<{ ok: boolean; comments: CommentType[] }>(`/articles/${id}/comments`)
      setComments(res.comments)
    } catch {
      // ignore
    }
  }, [id])

  useEffect(() => {
    fetchArticle()
    fetchComments()
  }, [fetchArticle, fetchComments])

  const handleLike = async () => {
    if (!id) return
    const res = await apiFetch<{ ok: boolean; liked: boolean }>(`/articles/${id}/like`, {
      method: 'POST',
    })
    setArticle((prev) =>
      prev
        ? {
            ...prev,
            isLiked: res.liked,
            likeCount: res.liked ? prev.likeCount + 1 : prev.likeCount - 1,
          }
        : prev
    )
  }

  const handleBookmark = async () => {
    if (!id) return
    const res = await apiFetch<{ ok: boolean; bookmarked: boolean }>(`/articles/${id}/bookmark`, {
      method: 'POST',
    })
    setArticle((prev) =>
      prev ? { ...prev, isBookmarked: res.bookmarked } : prev
    )
  }

  const handleComment = async () => {
    if (!id || !commentText.trim()) return
    setSubmitting(true)
    try {
      await apiFetch(`/articles/${id}/comments`, {
        method: 'POST',
        body: { content: commentText },
      })
      setCommentText('')
      fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return
    await apiFetch(`/articles/${id}/comments/${commentId}`, { method: 'DELETE' })
    fetchComments()
  }

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  if (!article) return null

  const sanitizedContent = sanitizeHtml(article.content)

  return (
    <div>
      <div className="article-detail">
        <div className="article-card__tags" style={{ marginBottom: '0.75rem' }}>
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

        <h1 className="article-detail__title">{article.title}</h1>

        <div className="article-detail__meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserAvatar name={article.author.name} imageUrl={article.author.imageUrl} size={28} />
            {article.author.name}
          </span>
          <span>{article.publishedAt ? dayjs(article.publishedAt).format('YYYY/MM/DD HH:mm') : ''}</span>
          <span>閲覧 {article.viewCount}</span>
        </div>

        <div
          className="article-detail__content"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* 添付ファイル */}
        {article.attachments.filter((a) => !a.isInlineImage).length > 0 && (
          <div className="article-detail__attachments">
            <h4>添付ファイル</h4>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              {article.attachments
                .filter((a) => !a.isInlineImage)
                .map((a) => (
                  <a
                    key={a.id}
                    href={`/uploads/${a.filePath}`}
                    download={a.fileName}
                    style={{ fontSize: '13px', color: '#e88da8' }}
                  >
                    {a.fileName} ({Math.round(a.fileSize / 1024)}KB)
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* アクション */}
        <div className="article-detail__actions">
          <button
            className={`action-btn${article.isLiked ? ' action-btn--active' : ''}`}
            onClick={handleLike}
          >
            <FontAwesomeIcon icon={faHeart} />
            {article.likeCount}
          </button>

          <button
            className={`action-btn${article.isBookmarked ? ' action-btn--active' : ''}`}
            onClick={handleBookmark}
          >
            <FontAwesomeIcon icon={faBookmark} />
            {article.isBookmarked ? 'ブックマーク済' : 'ブックマーク'}
          </button>
        </div>
      </div>

      {/* コメント */}
      <div className="si-card" style={{ marginTop: '1rem' }}>
        <div className="comment-section">
          <h3 className="comment-section__title">コメント ({comments.length})</h3>

          {comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-item__header">
                <UserAvatar name={comment.author.name} imageUrl={comment.author.imageUrl} size={24} />
                <span className="comment-item__author">{comment.author.name}</span>
                <span className="comment-item__date">
                  {dayjs(comment.createdAt).format('YYYY/MM/DD HH:mm')}
                </span>
                {(comment.author.id === user?.id || user?.role === 'ADMIN') && (
                  <button
                    className="si-btn--icon"
                    style={{ marginLeft: 'auto', fontSize: '12px', color: '#e35d6a' }}
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
              <div className="comment-item__content">{comment.content}</div>
            </div>
          ))}

          <div className="comment-form">
            <textarea
              className="comment-form__textarea"
              placeholder="コメントを入力..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="comment-form__actions">
              <Button
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
                size="sm"
              >
                {submitting ? '送信中...' : 'コメント'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
