import { useEffect, type ReactNode } from 'react'

type Props = {
  show: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ show, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [show])

  if (!show) return null

  return (
    <div className="si-modal-backdrop" onClick={onClose}>
      <div className="si-modal" onClick={(e) => e.stopPropagation()}>
        <div className="si-modal__header">
          <h3 className="si-modal__title">{title}</h3>
          <button className="si-modal__close" onClick={onClose}>&times;</button>
        </div>
        <div className="si-modal__body">{children}</div>
        {footer && <div className="si-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
