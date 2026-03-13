import { useState, useCallback } from 'react'
import Modal from '../components/atoms/Modal.tsx'
import Button from '../components/atoms/Button.tsx'

type ConfirmState = {
  message: string
  resolve: (value: boolean) => void
} | null

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(null)

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, resolve })
    })
  }, [])

  const handleOk = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const ConfirmDialog = () => (
    <Modal
      show={!!state}
      onClose={handleCancel}
      title="確認"
      footer={
        <>
          <Button variant="outline-secondary" onClick={handleCancel}>キャンセル</Button>
          <Button variant="outline-error" onClick={handleOk}>削除</Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: '14px' }}>{state?.message}</p>
    </Modal>
  )

  return { confirm, ConfirmDialog }
}
