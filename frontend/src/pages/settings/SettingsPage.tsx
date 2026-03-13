import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../api/client.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import type { UserSettings } from '../../types/index.ts'
import Button from '../../components/atoms/Button.tsx'
import FormField from '../../components/atoms/FormField.tsx'

export default function SettingsPage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  // 通知設定
  const [settings, setSettings] = useState<UserSettings>({
    notifyOnLike: true,
    notifyOnComment: true,
  })

  useEffect(() => {
    apiFetch<{ ok: boolean; settings: UserSettings }>('/settings')
      .then((res) => setSettings(res.settings))
      .catch(() => {})
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: { name, bio },
      })
      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwSaving(true)
    setPwError(null)
    setPwSaved(false)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      setPwSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setPwSaved(false), 2000)
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'パスワードの変更に失敗しました')
    } finally {
      setPwSaving(false)
    }
  }

  const handleToggleNotification = useCallback(
    async (key: keyof UserSettings) => {
      const newVal = !settings[key]
      setSettings((prev) => ({ ...prev, [key]: newVal }))
      await apiFetch('/settings', {
        method: 'PATCH',
        body: { [key]: newVal },
      })
    },
    [settings]
  )

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-header__title">設定</h1>
      </div>

      {/* プロフィール編集 */}
      <div className="si-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem' }}>プロフィール</h3>
        <div className="si-form">
          <FormField
            label="表示名"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <FormField
            label="自己紹介"
            type="textarea"
            value={bio}
            onChange={(e) => setBio(e.currentTarget.value)}
            placeholder="自己紹介を入力..."
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
            {saved && <span style={{ color: '#50c89f', fontSize: '13px' }}>保存しました</span>}
          </div>
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="si-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem' }}>パスワード変更</h3>
        <div className="si-form">
          <FormField
            label="現在のパスワード"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <FormField
            label="新しいパスワード（8文字以上）"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            isInvalid={!!pwError}
            errorMessage={pwError || undefined}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button
              onClick={handleChangePassword}
              disabled={pwSaving || !currentPassword || newPassword.length < 8}
            >
              {pwSaving ? '変更中...' : 'パスワードを変更'}
            </Button>
            {pwSaved && <span style={{ color: '#50c89f', fontSize: '13px' }}>変更しました</span>}
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="si-card">
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem' }}>通知設定</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifyOnLike}
              onChange={() => handleToggleNotification('notifyOnLike')}
            />
            <span style={{ fontSize: '14px' }}>いいね通知を受け取る</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifyOnComment}
              onChange={() => handleToggleNotification('notifyOnComment')}
            />
            <span style={{ fontSize: '14px' }}>コメント通知を受け取る</span>
          </label>
        </div>
      </div>
    </div>
  )
}
