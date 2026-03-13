import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, apiUpload } from '../../api/client.ts'
import type { Tag, ArticleDetail, FileAttachment } from '../../types/index.ts'
import { showToast } from '../../components/atoms/Toast.tsx'
import Button from '../../components/atoms/Button.tsx'
import FormField from '../../components/atoms/FormField.tsx'
import RichTextEditor from '../../components/organisms/RichTextEditor.tsx'

type AttachmentMeta = {
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
}

export default function ArticleCreatePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<FileAttachment[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // タグ一覧を取得
  useEffect(() => {
    apiFetch<{ ok: boolean; tags: Tag[] }>('/tags')
      .then((res) => setTags(res.tags))
      .catch(() => {})
  }, [])

  // 編集モード：既存記事データをロード
  useEffect(() => {
    if (!id) return
    apiFetch<{ ok: boolean; article: ArticleDetail }>(`/articles/${id}`)
      .then((res) => {
        setTitle(res.article.title)
        setContent(res.article.content)
        setSelectedTags(res.article.tags.map((t) => t.id))
        setExistingAttachments(res.article.attachments?.filter((a) => !a.isInlineImage) || [])
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) return
    setSaving(true)

    try {
      // ファイルアップロード → メタデータ収集
      const uploadedAttachments: AttachmentMeta[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiUpload<{
          ok: boolean
          file: { fileName: string; filePath: string; fileSize: number; mimeType: string }
        }>('/upload', formData)
        uploadedAttachments.push(res.file)
      }

      // 既存の添付ファイル（削除されていないもの）+ 新規アップロード分
      const keepAttachments: AttachmentMeta[] = existingAttachments
        .filter((a) => !removedAttachmentIds.includes(a.id))
        .map((a) => ({ fileName: a.fileName, filePath: a.filePath, fileSize: a.fileSize, mimeType: a.mimeType }))
      const allAttachments = [...keepAttachments, ...uploadedAttachments]

      if (isEdit) {
        // 記事更新
        await apiFetch(`/articles/${id}`, {
          method: 'PATCH',
          body: {
            title: title.trim(),
            content,
            status,
            tagIds: selectedTags,
            attachments: allAttachments,
          },
        })
        showToast('記事を更新しました')
        navigate(`/articles/${id}`)
      } else {
        // 記事作成
        const res = await apiFetch<{ ok: boolean; article: { id: string } }>('/articles', {
          method: 'POST',
          body: {
            title: title.trim(),
            content,
            status,
            tagIds: selectedTags,
            attachments: allAttachments.length > 0 ? allAttachments : undefined,
          },
        })

        showToast(status === 'PUBLISHED' ? '記事を公開しました' : '下書きを保存しました')
        if (status === 'PUBLISHED') {
          navigate(`/articles/${res.article.id}`)
        } else {
          navigate('/mypage')
        }
      }
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center" style={{ padding: '2rem' }}>読み込み中...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">{isEdit ? '記事編集' : '記事投稿'}</h1>
      </div>

      <div className="si-card">
        <div className="si-form">
          <div>
            <FormField
              label="タイトル"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              placeholder="記事のタイトルを入力"
              maxLength={30}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', color: title.length > 30 ? '#d32f2f' : '#9e9e9e', marginTop: '0.2rem' }}>
              {title.length} / 30
            </div>
          </div>

          {/* タグ選択 */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              タグ
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="article-tag"
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : `${tag.color}18`,
                    color: selectedTags.includes(tag.id) ? '#fff' : tag.color,
                    cursor: 'pointer',
                    border: 'none',
                    padding: '0.2rem 0.6rem',
                    fontSize: '12px',
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* リッチテキストエディタ */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              本文
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="記事の本文を入力..."
            />
          </div>

          {/* ファイル添付 */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              ファイル添付
            </label>

            {/* 既存の添付ファイル（編集時） */}
            {existingAttachments.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '11px', color: '#9e9e9e', marginBottom: '0.25rem' }}>添付済みファイル</div>
                {existingAttachments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.3rem 0',
                      fontSize: '12px',
                      color: removedAttachmentIds.includes(a.id) ? '#bdbdbd' : '#616161',
                      textDecoration: removedAttachmentIds.includes(a.id) ? 'line-through' : 'none',
                    }}
                  >
                    <span>{a.fileName} ({Math.round(a.fileSize / 1024)}KB)</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedAttachmentIds((prev) =>
                          prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                        )
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: removedAttachmentIds.includes(a.id) ? '#4caf50' : '#d32f2f',
                      }}
                    >
                      {removedAttachmentIds.includes(a.id) ? '元に戻す' : '削除'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ fontSize: '13px' }}
            />
            <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '0.25rem' }}>
              1ファイルあたり最大100MBまで（zip等も可）
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: '0.4rem', fontSize: '12px', color: '#616161' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                    <span>{f.name} ({Math.round(f.size / 1024)}KB)</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#d32f2f' }}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button
              variant="outline-secondary"
              onClick={() => handleSubmit('DRAFT')}
              disabled={saving || !title.trim()}
            >
              下書き保存
            </Button>
            <Button
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={saving || !title.trim()}
            >
              {saving ? '保存中...' : isEdit ? '更新する' : '公開する'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
