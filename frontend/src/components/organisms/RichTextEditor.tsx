import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBold,
  faItalic,
  faStrikethrough,
  faListUl,
  faListOl,
  faQuoteLeft,
  faCode,
  faImage,
  faLink,
  faUndo,
  faRedo,
  faMinus,
} from '@fortawesome/free-solid-svg-icons'
import { apiUpload } from '../../api/client.ts'

type Props = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: placeholder || '本文を入力...' }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  // 外部からcontentが変わった場合（編集モードで記事データをロードした時）
  const initialSet = useRef(false)
  useEffect(() => {
    if (editor && content && !initialSet.current) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content)
      }
      initialSet.current = true
    }
  }, [editor, content])

  if (!editor) return null

  const handleImageUpload = async () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await apiUpload<{
        ok: boolean
        file: { filePath: string }
      }>('/upload', formData)
      editor.chain().focus().setImage({ src: `/uploads/${res.file.filePath}` }).run()
    } catch {
      alert('画像のアップロードに失敗しました')
    }

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLinkInsert = () => {
    const url = prompt('URLを入力してください')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  type BtnProps = {
    icon: typeof faBold
    action: () => void
    active?: boolean
    title: string
  }

  const ToolbarButton = ({ icon, action, active, title }: BtnProps) => (
    <button
      type="button"
      className="si-btn si-btn--icon"
      style={{
        padding: '0.3rem 0.5rem',
        fontSize: '13px',
        background: active ? '#fce8ee' : 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: active ? '#e88da8' : '#616161',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
      title={title}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  )

  return (
    <div className="tiptap-editor">
      <div className="tiptap-editor__toolbar">
        <ToolbarButton
          icon={faBold}
          action={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="太字"
        />
        <ToolbarButton
          icon={faItalic}
          action={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="斜体"
        />
        <ToolbarButton
          icon={faStrikethrough}
          action={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="取り消し線"
        />
        <span style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 0.25rem' }} />
        <ToolbarButton
          icon={faListUl}
          action={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="箇条書き"
        />
        <ToolbarButton
          icon={faListOl}
          action={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="番号付きリスト"
        />
        <ToolbarButton
          icon={faQuoteLeft}
          action={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="引用"
        />
        <ToolbarButton
          icon={faCode}
          action={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="コードブロック"
        />
        <span style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 0.25rem' }} />
        <ToolbarButton icon={faImage} action={handleImageUpload} title="画像挿入" />
        <ToolbarButton
          icon={faLink}
          action={handleLinkInsert}
          active={editor.isActive('link')}
          title="リンク"
        />
        <ToolbarButton
          icon={faMinus}
          action={() => editor.chain().focus().setHorizontalRule().run()}
          title="水平線"
        />
        <span style={{ width: '1px', height: '20px', background: '#e0e0e0', margin: '0 0.25rem' }} />
        <ToolbarButton icon={faUndo} action={() => editor.chain().focus().undo().run()} title="元に戻す" />
        <ToolbarButton icon={faRedo} action={() => editor.chain().focus().redo().run()} title="やり直す" />
      </div>

      <div className="tiptap-editor__content">
        <EditorContent editor={editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  )
}
