import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    // POP（ブラウザの戻る/進む）の場合はスクロール位置を復元させる
    if (navType !== 'POP') {
      window.scrollTo(0, 0)
    }
  }, [pathname, navType])

  return null
}
