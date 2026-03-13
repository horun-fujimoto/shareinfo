import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../../api/client.ts'
import type { Tag } from '../../../types/index.ts'
import { useConfirm } from '../../../hooks/useConfirm.tsx'
import { showToast } from '../../../components/atoms/Toast.tsx'
import Button from '../../../components/atoms/Button.tsx'
import FormField from '../../../components/atoms/FormField.tsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil, faTrashCan, faPlus } from '@fortawesome/free-solid-svg-icons'

export default function TagManagementPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#e91e8c')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#e91e8c')
  const { confirm, ConfirmDialog } = useConfirm()

  const fetchTags = useCallback(async () => {
    try {
      const res = await apiFetch<{ ok: boolean; tags: Tag[] }>('/tags')
      setTags(res.tags)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await apiFetch('/admin/tags', {
      method: 'POST',
      body: { name: newName.trim(), color: newColor },
    })
    setNewName('')
    setNewColor('#e91e8c')
    fetchTags()
    showToast('タグを追加しました')
  }

  const handleUpdate = async (id: string) => {
    await apiFetch(`/admin/tags/${id}`, {
      method: 'PATCH',
      body: { name: editName.trim(), color: editColor },
    })
    setEditingId(null)
    fetchTags()
    showToast('タグを更新しました')
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm('このタグを削除しますか？')
    if (!ok) return
    await apiFetch(`/admin/tags/${id}`, { method: 'DELETE' })
    fetchTags()
    showToast('タグを削除しました')
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  return (
    <div>
      <ConfirmDialog />
      <div className="page-header">
        <h1 className="page-header__title">タグ管理</h1>
      </div>

      {/* 新規作成 */}
      <div className="si-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>タグ追加</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <FormField
              label="タグ名"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              placeholder="例）業務改善"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>色</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ height: '36px', width: '50px', border: 'none', cursor: 'pointer' }}
            />
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            <FontAwesomeIcon icon={faPlus} /> 追加
          </Button>
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="si-card">
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>タグ一覧</h3>
        {tags.length === 0 ? (
          <div className="text-center" style={{ padding: '1rem', color: '#9e9e9e' }}>
            タグがありません
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {tags.map((tag) => (
              <div
                key={tag.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #f0e4e8',
                }}
              >
                {editingId === tag.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ flex: 1, padding: '0.3rem 0.5rem', border: '1px solid #c0c7ce', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer' }}
                    />
                    <Button size="sm" onClick={() => handleUpdate(tag.id)}>保存</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setEditingId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: tag.color,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: '14px' }}>{tag.name}</span>
                    <span style={{ fontSize: '12px', color: '#9e9e9e' }}>
                      {tag.articleCount ?? 0}記事
                    </span>
                    <button className="si-btn--icon" onClick={() => startEdit(tag)}>
                      <FontAwesomeIcon icon={faPencil} style={{ fontSize: '12px' }} />
                    </button>
                    <button className="si-btn--icon" style={{ color: '#e35d6a' }} onClick={() => handleDelete(tag.id)}>
                      <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '12px' }} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
