import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../api/client.ts'
import type { AdminUser } from '../../../types/index.ts'
import Button from '../../../components/atoms/Button.tsx'
import Badge from '../../../components/atoms/Badge.tsx'
import FormField from '../../../components/atoms/FormField.tsx'
import dayjs from 'dayjs'
import Pagination from '../../../components/molecules/Pagination.tsx'
import { useConfirm } from '../../../hooks/useConfirm.tsx'
import { showToast } from '../../../components/atoms/Toast.tsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil, faTrashCan, faLock, faUnlock, faPlus } from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../components/atoms/Modal.tsx'

export default function UserListPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

  // モーダル
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [formUserId, setFormUserId] = useState('')
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('USER')
  const [formPassword, setFormPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(p))
      params.set('pageSize', '20')
      if (keyword) params.set('keyword', keyword)

      const res = await apiFetch<{ ok: boolean; users: AdminUser[]; total: number }>(
        `/admin/users?${params}`
      )
      setUsers(res.users)
      setTotal(res.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [keyword])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreate = () => {
    setModalMode('create')
    setEditUser(null)
    setFormUserId('')
    setFormName('')
    setFormEmail('')
    setFormRole('USER')
    setFormPassword('')
    setModalOpen(true)
  }

  const openEdit = (u: AdminUser) => {
    setModalMode('edit')
    setEditUser(u)
    setFormUserId(u.userId)
    setFormName(u.name)
    setFormEmail(u.email || '')
    setFormRole(u.role)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modalMode === 'create') {
        await apiFetch('/admin/users', {
          method: 'POST',
          body: {
            userId: formUserId,
            name: formName,
            email: formEmail || undefined,
            role: formRole,
            password: formPassword || undefined,
          },
        })
      } else if (editUser) {
        await apiFetch(`/admin/users/${editUser.id}`, {
          method: 'PATCH',
          body: { name: formName, email: formEmail || undefined, role: formRole },
        })
      }
      setModalOpen(false)
      fetchUsers(page)
      showToast(modalMode === 'create' ? 'ユーザーを作成しました' : 'ユーザーを更新しました')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: AdminUser) => {
    const ok = await confirm(`${u.name}を削除しますか？`)
    if (!ok) return
    await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' })
    fetchUsers(page)
    showToast(`${u.name}を削除しました`)
  }

  const handleUnlock = async (u: AdminUser) => {
    await apiFetch(`/admin/users/${u.id}/unlock`, { method: 'POST' })
    fetchUsers(page)
  }

  const handleResetPassword = async (u: AdminUser) => {
    const ok = await confirm(`${u.name}のパスワードをリセットしますか？`)
    if (!ok) return
    await apiFetch(`/admin/users/${u.id}/reset-password`, { method: 'POST' })
    showToast('パスワードをリセットしました。次回ログイン時に変更が必要です')
  }

  const handleToggleActive = async (u: AdminUser) => {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await apiFetch(`/admin/users/${u.id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    fetchUsers(page)
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="page-header">
        <h1 className="page-header__title">ユーザー管理</h1>
        <Button onClick={openCreate}>
          <FontAwesomeIcon icon={faPlus} /> 新規登録
        </Button>
      </div>

      {/* 検索 */}
      <div className="si-card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="si-search__input"
            style={{ border: '1px solid #c0c7ce', borderRadius: '6px', padding: '0.4rem 0.75rem', flex: 1 }}
            placeholder="ユーザーID・名前・メールで検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
          />
          <Button size="sm" onClick={() => fetchUsers(1)}>検索</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="si-table">
              <thead>
                <tr>
                  <th>ユーザーID</th>
                  <th>表示名</th>
                  <th>メール</th>
                  <th>ロール</th>
                  <th>状態</th>
                  <th>最終ログイン</th>
                  <th style={{ width: 220 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.status === 'INACTIVE' ? 0.5 : 1 }}>
                    <td>{u.userId}</td>
                    <td>{u.name}</td>
                    <td>{u.email || '-'}</td>
                    <td>
                      <Badge variant={u.role === 'ADMIN' ? 'primary' : 'secondary'}>
                        {u.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>
                          {u.status === 'ACTIVE' ? '有効' : '無効'}
                        </Badge>
                        {u.isLocked && (
                          <Badge variant="error">
                            <FontAwesomeIcon icon={faLock} />
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>{u.lastLoginAt ? dayjs(u.lastLoginAt).format('YYYY/MM/DD HH:mm') : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <Button variant="outline-primary" size="sm" onClick={() => openEdit(u)}>
                          <FontAwesomeIcon icon={faPencil} />
                        </Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => handleToggleActive(u)}>
                          {u.status === 'ACTIVE' ? '無効' : '有効'}
                        </Button>
                        {u.isLocked && (
                          <Button variant="outline-secondary" size="sm" onClick={() => handleUnlock(u)}>
                            <FontAwesomeIcon icon={faUnlock} />
                          </Button>
                        )}
                        <Button variant="outline-secondary" size="sm" onClick={() => handleResetPassword(u)}>
                          PW
                        </Button>
                        <Button variant="outline-error" size="sm" onClick={() => handleDelete(u)}>
                          <FontAwesomeIcon icon={faTrashCan} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <Pagination page={page} pageSize={20} total={total} onPageChange={fetchUsers} />
          )}
        </>
      )}

      {/* 作成/編集モーダル */}
      <Modal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'ユーザー新規登録' : 'ユーザー編集'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving || !formUserId.trim() || !formName.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormField
            label="ユーザーID（ログインID）"
            value={formUserId}
            onChange={(e) => setFormUserId(e.currentTarget.value)}
            placeholder="例）staff001"
            disabled={modalMode === 'edit'}
          />
          <FormField
            label="表示名"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            placeholder="例）山田 太郎"
          />
          <FormField
            label="メール（任意）"
            value={formEmail}
            onChange={(e) => setFormEmail(e.currentTarget.value)}
            placeholder="例）taro@example.com"
            type="email"
          />
          <FormField
            label="ロール"
            type="select"
            value={formRole}
            onChange={(e) => setFormRole(e.currentTarget.value)}
          >
            <option value="USER">ユーザー</option>
            <option value="ADMIN">管理者</option>
          </FormField>
          {modalMode === 'create' && (
            <FormField
              label="初期パスワード（空欄でpassword123）"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.currentTarget.value)}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
