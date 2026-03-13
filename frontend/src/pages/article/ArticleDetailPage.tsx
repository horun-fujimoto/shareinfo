import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/client.ts'
import type { ArticleDetail, Comment as CommentType } from '../../types/index.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { useConfirm } from '../../hooks/useConfirm.tsx'
import { sanitizeHtml } from '../../utils/sanitize.ts'
import { showToast } from '../../components/atoms/Toast.tsx'
import UserAvatar from '../../components/atoms/UserAvatar.tsx'
import Button from '../../components/atoms/Button.tsx'
import dayjs from 'dayjs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faBookmark, faTrash, faPencil, faCheck, faXmark, faDownload } from '@fortawesome/free-solid-svg-icons'

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // コメント編集
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

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
    } catch { /* コメント取得失敗は非致命的 */ }
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
    showToast(res.bookmarked ? 'ブックマークに追加しました' : 'ブックマークを解除しました')
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
      showToast('コメントを投稿しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return
    const ok = await confirm('このコメントを削除しますか？')
    if (!ok) return
    await apiFetch(`/articles/${id}/comments/${commentId}`, { method: 'DELETE' })
    fetchComments()
    showToast('コメントを削除しました')
  }

  const startEditComment = (comment: CommentType) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.content)
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!id || !editingCommentText.trim()) return
    try {
      await apiFetch(`/articles/${id}/comments/${commentId}`, {
        method: 'PATCH',
        body: { content: editingCommentText.trim() },
      })
      setEditingCommentId(null)
      setEditingCommentText('')
      fetchComments()
      showToast('コメントを更新しました')
    } catch {
      showToast('コメントの更新に失敗しました', 'error')
    }
  }

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  if (!article) return null

  const sanitizedContent = sanitizeHtml(article.content)
  const nonInlineAttachments = article.attachments.filter((a) => !a.isInlineImage)

  return (
    <div>
      <ConfirmDialog />
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
          {article.authorId === user?.id && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => navigate(`/articles/${id}/edit`)}
              style={{ marginLeft: 'auto' }}
            >
              <FontAwesomeIcon icon={faPencil} /> 編集
            </Button>
          )}
        </div>

        <div
          className="article-detail__content"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* 添付ファイル */}
        {nonInlineAttachments.length > 0 && (
          <div className="article-detail__attachments">
            <h4>添付ファイル</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {nonInlineAttachments.map((a) => {
                // Windows環境のバックスラッシュをスラッシュに正規化
                const safePath = a.filePath.replace(/\\/g, '/')
                return (
                  <a
                    key={a.id}
                    href={`/uploads/${safePath}`}
                    download={a.fileName}
                    className="attachment-download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    <span style={{ flex: 1 }}>{a.fileName}</span>
                    <span className="attachment-download__size">
                      {a.fileSize >= 1024 * 1024
                        ? `${(a.fileSize / (1024 * 1024)).toFixed(1)}MB`
                        : `${Math.round(a.fileSize / 1024)}KB`}
                    </span>
                  </a>
                )
              })}
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
                  {comment.updatedAt !== comment.createdAt && ' (編集済)'}
                </span>
                {(comment.author.id === user?.id || user?.role === 'ADMIN') && editingCommentId !== comment.id && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
                    {comment.author.id === user?.id && (
                      <button
                        className="si-btn--icon"
                        style={{ fontSize: '12px', color: '#9e9e9e' }}
                        onClick={() => startEditComment(comment)}
                      >
                        <FontAwesomeIcon icon={faPencil} />
                      </button>
                    )}
                    <button
                      className="si-btn--icon"
                      style={{ fontSize: '12px', color: '#e35d6a' }}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div style={{ marginTop: '0.4rem' }}>
                  <textarea
                    className="comment-form__textarea"
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    style={{ minHeight: '60px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                    <Button size="sm" variant="outline-secondary" onClick={cancelEditComment}>
                      <FontAwesomeIcon icon={faXmark} /> 取消
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateComment(comment.id)} disabled={!editingCommentText.trim()}>
                      <FontAwesomeIcon icon={faCheck} /> 保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="comment-item__content">{comment.content}</div>
              )}
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
