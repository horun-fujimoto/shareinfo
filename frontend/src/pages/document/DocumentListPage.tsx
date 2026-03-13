import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client.ts'
import { sanitizeHtml } from '../../utils/sanitize.ts'
import type { Document } from '../../types/index.ts'
import dayjs from 'dayjs'

export default function DocumentListPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selected, setSelected] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ ok: boolean; documents: Document[] }>('/documents')
      .then((res) => {
        setDocuments(res.documents)
        if (res.documents.length > 0) setSelected(res.documents[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  // サニタイズしたHTMLを安全にレンダリング
  const renderSanitizedContent = (html: string) => {
    const cleanHtml = sanitizeHtml(html)
    return <div className="article-detail__content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">ドキュメント</h1>
      </div>

      {documents.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          ドキュメントはまだありません。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1rem' }}>
          <div className="si-card" style={{ padding: '0.5rem', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelected(doc)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: selected?.id === doc.id ? '#fce8ee' : 'none',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '0.6rem 0.75rem',
                  fontSize: '13px',
                  fontWeight: selected?.id === doc.id ? 600 : 400,
                  color: selected?.id === doc.id ? '#c4687e' : '#212121',
                }}
              >
                {doc.title}
              </button>
            ))}
          </div>

          {selected && (
            <div className="si-card">
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '0.5rem' }}>
                {selected.title}
              </h2>
              <div style={{ fontSize: '12px', color: '#9e9e9e', marginBottom: '1rem' }}>
                最終更新: {dayjs(selected.updatedAt).format('YYYY/MM/DD HH:mm')}
                {' | '}作成者: {selected.author.name}
              </div>
              {renderSanitizedContent(selected.content)}

              {selected.attachments.length > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f0e4e8', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem' }}>添付ファイル</h4>
                  {selected.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/uploads/${a.filePath}`}
                      download={a.fileName}
                      style={{ display: 'block', fontSize: '13px', color: '#e88da8', marginBottom: '0.25rem' }}
                    >
                      {a.fileName} ({Math.round(a.fileSize / 1024)}KB)
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
