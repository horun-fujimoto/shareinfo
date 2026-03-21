import { useEffect, useCallback, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faDownload } from '@fortawesome/free-solid-svg-icons'

type Props = {
  src: string | null
  onClose: () => void
}

export function ImageLightbox({ src, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!src) return
    setLoaded(false)
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [src, handleKeyDown])

  if (!src) return null

  const fileName = src.split('/').pop() || 'image'

  return (
    <div
      ref={overlayRef}
      className="lightbox-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="lightbox-toolbar">
        <a
          href={src}
          download={fileName}
          className="lightbox-btn"
          title="ダウンロード"
          onClick={(e) => e.stopPropagation()}
        >
          <FontAwesomeIcon icon={faDownload} />
        </a>
        <button className="lightbox-btn" onClick={onClose} title="閉じる">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <img
        src={src}
        alt=""
        className={`lightbox-image${loaded ? ' lightbox-image--loaded' : ''}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

/**
 * コンテンツ内の img をクリックしたらライトボックスを開くフック
 * callbackRef パターンでDOM要素にリスナーを確実にアタッチする
 */
export function useImageLightbox() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const listenerRef = useRef<{ el: HTMLDivElement; handler: (e: Event) => void } | null>(null)

  const contentRef = useCallback((el: HTMLDivElement | null) => {
    // 前のリスナーを解除
    if (listenerRef.current) {
      listenerRef.current.el.removeEventListener('click', listenerRef.current.handler)
      listenerRef.current = null
    }

    if (!el) return

    const handler = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        const src = (target as HTMLImageElement).src
        if (src) setLightboxSrc(src)
      }
    }

    el.addEventListener('click', handler)
    listenerRef.current = { el, handler }
  }, [])

  const closeLightbox = useCallback(() => setLightboxSrc(null), [])

  return { contentRef, lightboxSrc, closeLightbox }
}
