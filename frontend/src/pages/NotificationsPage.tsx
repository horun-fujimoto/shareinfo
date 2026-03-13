import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client.ts'
import type { Notification } from '../types/index.ts'
import UserAvatar from '../components/atoms/UserAvatar.tsx'
import Button from '../components/atoms/Button.tsx'
import Pagination from '../components/molecules/Pagination.tsx'
import dayjs from 'dayjs'

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchNotifications = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch<{
        ok: boolean
        notifications: Notification[]
        total: number
      }>(`/notifications?page=${p}&pageSize=${PAGE_SIZE}`)
      setNotifications(res.notifications)
      setTotal(res.total ?? res.notifications.length)
      setPage(p)
    } catch {
      setError('通知の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications(1)
  }, [fetchNotifications])

  const handleReadAll = async () => {
    await apiFetch('/notifications/read-all', { method: 'POST' })
    fetchNotifications(page)
  }

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await apiFetch(`/notifications/${notif.id}/read`, { method: 'PATCH' })
    }
    if (notif.articleId) {
      navigate(`/articles/${notif.articleId}`)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">通知</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline-primary" size="sm" onClick={handleReadAll}>
            すべて既読
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
      ) : error ? (
        <div className="si-card text-center" style={{ padding: '3rem', color: '#d32f2f' }}>
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          通知はありません。
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="si-card"
                style={{
                  cursor: 'pointer',
                  padding: '0.75rem 1rem',
                  backgroundColor: notif.isRead ? '#fff' : '#fce8ee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
                onClick={() => handleClick(notif)}
              >
                <UserAvatar name={notif.actor.name} imageUrl={notif.actor.imageUrl} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px' }}>
                    <strong>{notif.actor.name}</strong>
                    {notif.type === 'LIKE'
                      ? ' があなたの記事にいいねしました'
                      : ' があなたの記事にコメントしました'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
                    {dayjs(notif.createdAt).format('YYYY/MM/DD HH:mm')}
                  </div>
                </div>
                {!notif.isRead && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#e88da8',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={fetchNotifications} />
          )}
        </>
      )}
    </div>
  )
}
