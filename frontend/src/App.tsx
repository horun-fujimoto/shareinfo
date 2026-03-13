import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.tsx'
import ToastContainer from './components/atoms/Toast.tsx'
import { AuthProvider } from './hooks/AuthProvider.tsx'
import { useAuth } from './hooks/useAuth.ts'
import AppLayout from './components/layout/AppLayout.tsx'
import LoginPage from './pages/LoginPage.tsx'
import HomePage from './pages/HomePage.tsx'
import PopularPage from './pages/PopularPage.tsx'
import SearchPage from './pages/SearchPage.tsx'
import ArticleDetailPage from './pages/article/ArticleDetailPage.tsx'
import ArticleCreatePage from './pages/article/ArticleCreatePage.tsx'
import DocumentListPage from './pages/document/DocumentListPage.tsx'
import MyPage from './pages/mypage/MyPage.tsx'
import SettingsPage from './pages/settings/SettingsPage.tsx'
import NotificationsPage from './pages/NotificationsPage.tsx'
import UserListPage from './pages/admin/user/UserListPage.tsx'
import TagManagementPage from './pages/admin/tag/TagManagementPage.tsx'
import DocumentManagementPage from './pages/admin/document/DocumentManagementPage.tsx'
import ChangePasswordPage from './pages/ChangePasswordPage.tsx'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>読み込み中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>読み込み中...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/change-password" element={user?.mustChangePassword ? <ChangePasswordPage /> : <Navigate to="/" replace />} />

      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/popular" element={<ProtectedRoute><PopularPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/articles/new" element={<ProtectedRoute><ArticleCreatePage /></ProtectedRoute>} />
      <Route path="/articles/:id" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
      <Route path="/articles/:id/edit" element={<ProtectedRoute><ArticleCreatePage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentListPage /></ProtectedRoute>} />
      <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

      {/* 管理者ルート */}
      <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UserListPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/tags" element={<ProtectedRoute><AdminRoute><TagManagementPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/documents" element={<ProtectedRoute><AdminRoute><DocumentManagementPage /></AdminRoute></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastContainer />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
