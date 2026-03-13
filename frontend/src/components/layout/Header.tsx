import { faDoorClosed } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Bell, Settings, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import { apiFetch } from '../../api/client.ts'
import UserAvatar from '../atoms/UserAvatar.tsx'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const loc = useLocation()

  // 未読通知数を取得
  useEffect(() => {
    if (!user) return
    apiFetch<{ ok: boolean; count: number }>('/notifications/unread-count')
      .then((res) => setUnreadCount(res.count))
      .catch(() => {})
  }, [user, loc.pathname])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login')
  }, [logout, navigate])

  if (!user) return null

  return (
    <header className="si-header">
      <div className="si-header__left" />

      <div className="si-header__right">
        {/* 通知 */}
        <Link to="/notifications" className="si-btn--icon" aria-label="通知">
          <div className="si-header__notification">
            <Bell size={20} fill="currentColor" />
            {unreadCount > 0 && <span className="notification-dot" />}
          </div>
        </Link>

        {/* ユーザーメニュー */}
        <div className="si-user-menu ms-2" ref={menuRef}>
          <button
            className="si-user-menu__trigger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <UserAvatar name={user.name} imageUrl={user.imageUrl} size={36} />
          </button>

          {isMenuOpen && (
            <div className="si-dropdown-menu">
              <div className="si-dropdown-menu__header">
                <div className="d-flex align-items-center gap-3">
                  <UserAvatar name={user.name} imageUrl={user.imageUrl} size={40} />
                  <div className="d-flex flex-column si-dropdown-menu__user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role text-muted">
                      {user.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="si-dropdown-menu__list">
                <Link to="/mypage" className="si-dropdown-item">
                  <User size={18} />
                  <span>マイページ</span>
                </Link>
                <Link to="/settings" className="si-dropdown-item">
                  <Settings size={18} />
                  <span>設定</span>
                </Link>
              </div>

              <div className="si-dropdown-menu__footer">
                <button className="si-dropdown-item" onClick={handleLogout}>
                  <FontAwesomeIcon icon={faDoorClosed} />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
