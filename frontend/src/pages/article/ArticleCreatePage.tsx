import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch, apiUpload } from '../../api/client.ts'
import type { Tag, ArticleDetail } from '../../types/index.ts'
import Button from '../../components/atoms/Button.tsx'
import FormField from '../../components/atoms/FormField.tsx'
import RichTextEditor from '../../components/organisms/RichTextEditor.tsx'

export default function ArticleCreatePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
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
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) return
    setSaving(true)

    try {
      // ファイルアップロード
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        await apiUpload<{
          ok: boolean
          file: { fileName: string; filePath: string; fileSize: number; mimeType: string }
        }>('/upload', formData)
      }

      if (isEdit) {
        // 記事更新
        await apiFetch(`/articles/${id}`, {
          method: 'PATCH',
          body: {
            title: title.trim(),
            content,
            status,
            tagIds: selectedTags,
          },
        })
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
          },
        })

        if (status === 'PUBLISHED') {
          navigate(`/articles/${res.article.id}`)
        } else {
          navigate('/mypage')
        }
      }
    } catch {
      alert('保存に失敗しました')
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
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ fontSize: '13px' }}
            />
            <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '0.25rem' }}>
              1ファイルあたり最大100MBまで
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: '0.4rem', fontSize: '12px', color: '#616161' }}>
                {files.map((f, i) => (
                  <div key={i}>{f.name} ({Math.round(f.size / 1024)}KB)</div>
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
