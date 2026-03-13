import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar.tsx'
import Header from './Header.tsx'

type Props = {
  children: ReactNode
}

export default function AppLayout({ children }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleSidebar={() => setIsCollapsed((p) => !p)}
      />
      <div className={`main-area${isCollapsed ? ' main-area--collapsed' : ''}`}>
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
