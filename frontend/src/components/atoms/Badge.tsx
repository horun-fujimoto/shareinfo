import type { ReactNode } from 'react'

type Props = {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'secondary'
  children: ReactNode
  className?: string
}

export default function Badge({ variant = 'primary', children, className = '' }: Props) {
  return (
    <span className={`si-badge si-badge--${variant} ${className}`}>
      {children}
    </span>
  )
}
