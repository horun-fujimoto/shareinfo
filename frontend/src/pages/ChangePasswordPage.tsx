import { useState } from 'react'
import { apiFetch } from '../api/client.ts'
import { useAuth } from '../hooks/useAuth.ts'
import Button from '../components/atoms/Button.tsx'
import FormField from '../components/atoms/FormField.tsx'

export default function ChangePasswordPage() {
  const { refresh } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/auth/set-initial-password', {
        method: 'POST',
        body: { newPassword },
      })
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'パスワードの変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-card__title">パスワード変更</h2>
        <p style={{ fontSize: '13px', color: '#616161', marginBottom: '1.5rem', textAlign: 'center' }}>
          初回ログインのため、新しいパスワードを設定してください
        </p>

        <div className="si-form">
          <FormField
            label="新しいパスワード（8文字以上）"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            placeholder="新しいパスワードを入力"
          />
          <FormField
            label="パスワード確認"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            placeholder="パスワードをもう一度入力"
            isInvalid={!!error}
            errorMessage={error || undefined}
          />
          <Button
            onClick={handleSubmit}
            disabled={saving || !newPassword || !confirmPassword}
            style={{ width: '100%' }}
          >
            {saving ? '変更中...' : 'パスワードを変更'}
          </Button>
        </div>
      </div>
    </div>
  )
}
