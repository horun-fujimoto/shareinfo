import { useEffect, useState, useCallback } from 'react'

type ToastItem = {
  id: number
  message: string
  type: 'success' | 'error'
}

let addToastFn: ((message: string, type?: 'success' | 'error') => void) | null = null

/** グローバルにトーストを表示する */
export function showToast(message: string, type: 'success' | 'error' = 'success') {
  addToastFn?.(message, type)
}

let nextId = 0

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            background: t.type === 'success' ? '#4caf50' : '#d32f2f',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'toast-in 0.3s ease',
            minWidth: '200px',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
