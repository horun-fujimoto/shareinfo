import {
  faBars,
  faBook,
  faFire,
  faMagnifyingGlass,
  faPen,
  faTag,
  faUsers,
  faXmark,
  faNewspaper,
  faFileAlt,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'
import Button from '../atoms/Button.tsx'

type MenuItem = {
  label: string
  icon: typeof faBars
  path: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { label: '新着記事', icon: faNewspaper, path: '/' },
  { label: '人気記事', icon: faFire, path: '/popular' },
  { label: '記事検索', icon: faMagnifyingGlass, path: '/search' },
  { label: '記事投稿', icon: faPen, path: '/articles/new' },
  { label: 'ドキュメント', icon: faBook, path: '/documents' },
]

const adminMenuItems: MenuItem[] = [
  { label: 'ユーザー管理', icon: faUsers, path: '/admin/users', adminOnly: true },
  { label: 'タグ管理', icon: faTag, path: '/admin/tags', adminOnly: true },
  { label: 'ドキュメント作成', icon: faFileAlt, path: '/admin/documents', adminOnly: true },
]

type Props = {
  isCollapsed: boolean
  onToggleSidebar: () => void
}

export default function Sidebar({ isCollapsed, onToggleSidebar }: Props) {
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const handleItemClick = () => {
    if (window.innerWidth <= 768) {
      onToggleSidebar()
    }
  }

  return (
    <>
      <div
        className={`sidebar-backdrop${!isCollapsed ? ' show' : ''}`}
        onClick={onToggleSidebar}
      />

      <button
        className={`mobile-menu-trigger${!isCollapsed ? ' hidden' : ''}`}
        onClick={onToggleSidebar}
        aria-label="メニューを開く"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside className={`sidebar${isCollapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="mobile-header">
          <div className="sidebar-brand mobile-brand">
            <Link to="/" className="sidebar-brand__link">
              <div className="sidebar-brand__logo">S</div>
              <span className="sidebar-brand__text">ShareInfo</span>
            </Link>
          </div>
          <div className="mobile-close-btn">
            <Button variant="outline-secondary" className="si-btn--icon" onClick={onToggleSidebar}>
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        </div>

        <div className="sidebar-brand pc-brand">
          <Link to="/" className="sidebar-brand__link">
            <div className="sidebar-brand__logo">S</div>
            {!isCollapsed && <span className="sidebar-brand__text">ShareInfo</span>}
          </Link>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
              <Link to={item.path} onClick={handleItemClick}>
                <span className="menu-icon">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                <span className="menu-label">{item.label}</span>
              </Link>
            </li>
          ))}

          {isAdmin && (
            <>
              <li style={{ padding: '0.5rem 0.75rem', opacity: 0.5, fontSize: '11px', fontWeight: 600 }}>
                <span className="menu-label">管理</span>
              </li>
              {adminMenuItems.map((item) => (
                <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
                  <Link to={item.path} onClick={handleItemClick}>
                    <span className="menu-icon">
                      <FontAwesomeIcon icon={item.icon} />
                    </span>
                    <span className="menu-label">{item.label}</span>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>

        <div className="sidebar-header-wrapper pc-toggle-wrapper" onClick={onToggleSidebar}>
          <button className="sidebar-toggle-btn" aria-label="サイドバーを開閉" type="button">
            <FontAwesomeIcon icon={isCollapsed ? faBars : faXmark} />
          </button>
        </div>
      </aside>
    </>
  )
}
