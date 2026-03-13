import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAnglesLeft,
  faAnglesRight,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
}

export default function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const generatePageNumbers = () => {
    const PAGE_RANGE = 3
    const pages = new Set<number>()
    pages.add(1)
    if (pageCount > 1) pages.add(pageCount)
    for (let i = -PAGE_RANGE; i <= PAGE_RANGE; i++) {
      const p = page + i
      if (p > 1 && p < pageCount) pages.add(p)
    }
    const sorted = Array.from(pages).sort((a, b) => a - b)
    const result: (number | '…')[] = []
    let last = 0
    for (const p of sorted) {
      if (p > last + 1) result.push('…')
      result.push(p)
      last = p
    }
    return result
  }

  const pages = generatePageNumbers()

  return (
    <div className="si-pagination">
      <button
        className="si-pagination__nav"
        disabled={page === 1}
        onClick={() => onPageChange(1)}
      >
        <FontAwesomeIcon icon={faAnglesLeft} />
      </button>
      <button
        className="si-pagination__nav"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="si-pagination__ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`si-pagination__num${p === page ? ' si-pagination__num--active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="si-pagination__nav"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
      <button
        className="si-pagination__nav"
        disabled={page === pageCount}
        onClick={() => onPageChange(pageCount)}
      >
        <FontAwesomeIcon icon={faAnglesRight} />
      </button>
    </div>
  )
}
