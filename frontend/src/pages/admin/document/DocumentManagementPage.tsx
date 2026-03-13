import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../api/client.ts'
import { useConfirm } from '../../../hooks/useConfirm.tsx'
import { showToast } from '../../../components/atoms/Toast.tsx'
import Button from '../../../components/atoms/Button.tsx'
import FormField from '../../../components/atoms/FormField.tsx'
import RichTextEditor from '../../../components/organisms/RichTextEditor.tsx'
import Badge from '../../../components/atoms/Badge.tsx'
import dayjs from 'dayjs'

type DocSummary = {
  id: string
  title: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  author: { id: string; name: string }
}

export default function DocumentManagementPage() {
  const [documents, setDocuments] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)

  // 編集フォーム
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPublished, setEditPublished] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiFetch<{ ok: boolean; documents: DocSummary[] }>('/admin/documents')
      setDocuments(res.documents)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleNew = () => {
    setEditId(null)
    setEditTitle('')
    setEditContent('')
    setEditPublished(false)
    setShowForm(true)
  }

  const handleEdit = async (docId: string) => {
    try {
      const res = await apiFetch<{
        ok: boolean
        document: { id: string; title: string; content: string; published: boolean }
      }>(`/documents/${docId}`)
      setEditId(res.document.id)
      setEditTitle(res.document.title)
      setEditContent(res.document.content)
      setEditPublished(res.document.published)
      setShowForm(true)
    } catch {
      showToast('ドキュメントの読み込みに失敗しました', 'error')
    }
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await apiFetch(`/admin/documents/${editId}`, {
          method: 'PATCH',
          body: { title: editTitle.trim(), content: editContent, published: editPublished },
        })
      } else {
        await apiFetch('/admin/documents', {
          method: 'POST',
          body: { title: editTitle.trim(), content: editContent, published: editPublished },
        })
      }
      setShowForm(false)
      fetchDocuments()
      showToast(editId ? 'ドキュメントを更新しました' : 'ドキュメントを作成しました')
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (docId: string) => {
    const ok = await confirm('このドキュメントを削除しますか？')
    if (!ok) return
    await apiFetch(`/admin/documents/${docId}`, { method: 'DELETE' })
    fetchDocuments()
    showToast('ドキュメントを削除しました')
  }

  const handleTogglePublish = async (doc: DocSummary) => {
    await apiFetch(`/admin/documents/${doc.id}`, {
      method: 'PATCH',
      body: { published: !doc.published },
    })
    fetchDocuments()
  }

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  if (showForm) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-header__title">
            {editId ? 'ドキュメント編集' : 'ドキュメント作成'}
          </h1>
        </div>
        <div className="si-card">
          <div className="si-form">
            <div>
              <FormField
                label="タイトル"
                value={editTitle}
                onChange={(e) => setEditTitle(e.currentTarget.value)}
                placeholder="ドキュメントのタイトル"
                maxLength={30}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: editTitle.length > 30 ? '#d32f2f' : '#9e9e9e', marginTop: '0.2rem' }}>
                {editTitle.length} / 30
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                本文
              </label>
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="ドキュメントの内容を入力..."
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editPublished}
                onChange={(e) => setEditPublished(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>公開する</span>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving || !editTitle.trim()}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-header__title">ドキュメント管理</h1>
        <Button onClick={handleNew}>新規作成</Button>
      </div>

      {documents.length === 0 ? (
        <div className="si-card text-center" style={{ padding: '3rem' }}>
          ドキュメントがありません
        </div>
      ) : (
        <div className="si-table-wrapper">
          <table className="si-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>状態</th>
                <th>作成者</th>
                <th>更新日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600 }}>{doc.title}</td>
                  <td>
                    <Badge variant={doc.published ? 'success' : 'secondary'}>
                      {doc.published ? '公開' : '非公開'}
                    </Badge>
                  </td>
                  <td>{doc.author.name}</td>
                  <td>{dayjs(doc.updatedAt).format('YYYY/MM/DD')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(doc.id)}>
                        編集
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => handleTogglePublish(doc)}>
                        {doc.published ? '非公開' : '公開'}
                      </Button>
                      <Button variant="outline-error" size="sm" onClick={() => handleDelete(doc.id)}>
                        削除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
