import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'
import Button from '../components/atoms/Button.tsx'
import FormField from '../components/atoms/FormField.tsx'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await login(userId, password)
      nav('/')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ログインに失敗しました'
      setErr(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">ログイン</h1>
          <div className="auth-card__desc">ShareInfo</div>
        </div>

        <div className="auth-card__body">
          <form className="si-form" onSubmit={onSubmit}>
            <FormField
              label="ユーザーID"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.currentTarget.value)}
              isInvalid={!!err}
            />
            <FormField
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              isInvalid={!!err}
              errorMessage={err || undefined}
            />

            <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={busy || !userId.trim() || !password.trim()}>
                {busy ? '...' : 'ログイン'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
