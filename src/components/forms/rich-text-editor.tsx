"use client"

import React, { useEffect, useMemo } from 'react'
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'

export type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

const extensions = [TextStyle, StarterKit]

function HeadingSelect({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isParagraph: ctx.editor.isActive('paragraph') ?? false,
      h1: ctx.editor.isActive('heading', { level: 1 }) ?? false,
      h2: ctx.editor.isActive('heading', { level: 2 }) ?? false,
      h3: ctx.editor.isActive('heading', { level: 3 }) ?? false,
      h4: ctx.editor.isActive('heading', { level: 4 }) ?? false,
      h5: ctx.editor.isActive('heading', { level: 5 }) ?? false,
      h6: ctx.editor.isActive('heading', { level: 6 }) ?? false,
    }),
  })
  const current = state.isParagraph ? 'p' : state.h1 ? 'h1' : state.h2 ? 'h2' : state.h3 ? 'h3' : state.h4 ? 'h4' : state.h5 ? 'h5' : state.h6 ? 'h6' : 'p'
  return (
    <select
      title="Stile"
      aria-label="Stile"
      className="sel"
      value={current}
      onChange={(e) => {
        const v = e.target.value
        const chain = editor.chain().focus()
        if (v === 'p') chain.setParagraph().run()
        else chain.toggleHeading({ level: Number(v.slice(1)) as 1|2|3|4|5|6 }).run()
      }}
    >
      <option value="p">Paragrafo</option>
      <option value="h1">Titolo 1</option>
      <option value="h2">Titolo 2</option>
      <option value="h3">Titolo 3</option>
      <option value="h4">Titolo 4</option>
      <option value="h5">Titolo 5</option>
      <option value="h6">Titolo 6</option>
    </select>
  )
}

function MenuBar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: (ctx) => ({
      canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
      isBold: ctx.editor.isActive('bold') ?? false,
      canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
      isItalic: ctx.editor.isActive('italic') ?? false,
      canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
      isStrike: ctx.editor.isActive('strike') ?? false,
      canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
      isCode: ctx.editor.isActive('code') ?? false,
      canClearMarks: ctx.editor.can().chain().unsetAllMarks().run() ?? false,
      isBulletList: ctx.editor.isActive('bulletList') ?? false,
      isOrderedList: ctx.editor.isActive('orderedList') ?? false,
      isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
      isBlockquote: ctx.editor.isActive('blockquote') ?? false,
      canUndo: ctx.editor.can().chain().undo().run() ?? false,
      canRedo: ctx.editor.can().chain().redo().run() ?? false,
    }),
  })

  return (
    <div className="toolbar">
      <div className="group">
        <HeadingSelect editor={editor} />
      </div>
      <div className="group">
        <IconBtn title="Grassetto" active={s.isBold} disabled={!s.canBold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </IconBtn>
        <IconBtn title="Corsivo" active={s.isItalic} disabled={!s.canItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </IconBtn>
        <IconBtn title="Barrato" active={s.isStrike} disabled={!s.canStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>S</s>
        </IconBtn>
        <IconBtn title="Codice" active={s.isCode} disabled={!s.canCode} onClick={() => editor.chain().focus().toggleCode().run()}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </IconBtn>
      </div>
      <div className="group">
        <IconBtn title="Elenco puntato" active={s.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</IconBtn>
        <IconBtn title="Elenco numerato" active={s.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</IconBtn>

        <IconBtn title="Citazione" active={s.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“”</IconBtn>
        <IconBtn title="Linea" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</IconBtn>
      </div>
      <div className="group">
        <IconBtn title="Annulla" disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()}>↶</IconBtn>
        <IconBtn title="Ripristina" disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()}>↷</IconBtn>
      </div>
    </div>
  )
}

function IconBtn({ title, active, disabled, onClick, children }: { title: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`btn ${active ? 'is-active' : ''}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ value, onChange, placeholder = 'Scrivi qui...', minHeight = 640 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions,
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap max-w-none w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm focus:outline-none',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  const isReady = useMemo(() => Boolean(editor), [editor])

  return (
    <div className="space-y-2">
      {editor ? <MenuBar editor={editor} /> : null}
      {!isReady ? (
        <div className="text-sm text-gray-500">Caricamento editor...</div>
      ) : (
        <EditorContent editor={editor} />
      )}
      <style jsx global>{`
        /* Toolbar layout */
        .toolbar { position: sticky; top: 0; z-index: 20; display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; padding: .5rem; border: 1px solid #e5e7eb; background: #ffffff; border-radius: .5rem; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .group { display: flex; gap: .25rem; align-items: center; }
        .btn { padding: .35rem .55rem; border-radius: .375rem; border: 1px solid #e5e7eb; background: #fff; color: #111827; display: inline-flex; align-items: center; gap: .25rem; }
        .btn:hover { background: #f3f4f6; }
        .btn.is-active { outline: 2px solid rgba(245, 158, 11, .5); outline-offset: 1px; }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .sel { padding: .35rem .45rem; border-radius: .375rem; border: 1px solid #e5e7eb; background: #fff; color: #111827; }
        .sel:hover { background: #f9fafb; }

        /* Dark mode */
        [data-theme="dark"] .toolbar { background: #0f172a; border-color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,.35); }
        [data-theme="dark"] .btn { background: #111827; border-color: #374151; color: #e5e7eb; }
        [data-theme="dark"] .btn:hover { background: #1f2937; }
        [data-theme="dark"] .sel { background: #111827; border-color: #374151; color: #e5e7eb; }

        /* Editor content */
        .tiptap :first-child { margin-top: 0; }
        [data-theme="dark"] .tiptap { background: #0b1220; color: #e5e7eb; }
        .tiptap ul, .tiptap ol { padding: 0 1rem; margin: 1.25rem 1rem 1.25rem 0.4rem; }
        .tiptap ul { list-style: disc; }
        .tiptap ol { list-style: decimal; }
        .tiptap ul li p, .tiptap ol li p { margin-top: 0.25em; margin-bottom: 0.25em; }
        .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6 { line-height: 1.1; margin-top: 2.5rem; text-wrap: pretty; }
        .tiptap h1, .tiptap h2 { margin-top: 3.5rem; margin-bottom: 1.5rem; }
        .tiptap h1 { font-size: 1.4rem; }
        .tiptap h2 { font-size: 1.2rem; }
        .tiptap h3 { font-size: 1.1rem; }
        .tiptap h4, .tiptap h5, .tiptap h6 { font-size: 1rem; }
        .tiptap code { background-color: rgba(139,92,246,.12); border-radius: 0.4rem; color: #111827; font-size: 0.85rem; padding: 0.25em 0.3em; }
        [data-theme="dark"] .tiptap code { color: #e5e7eb; }
        .tiptap pre { background: #0f172a; border-radius: 0.5rem; color: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; margin: 1.5rem 0; padding: 0.75rem 1rem; }
        .tiptap pre code { background: none; color: inherit; font-size: 0.8rem; padding: 0; }
        .tiptap blockquote { border-left: 3px solid #e5e7eb; margin: 1.5rem 0; padding-left: 1rem; }
        [data-theme="dark"] .tiptap blockquote { border-left-color: #334155; color: #e5e7eb; }
        [data-theme="dark"] .tiptap blockquote p { color: #e5e7eb; }
        .tiptap hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
        [data-theme="dark"] .tiptap hr { border-top-color: #334155; }
      `}</style>
    </div>
  )
}
