import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  content: Record<string, unknown> | null
}

export function RichTextViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? undefined,
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-invert prose-sm max-w-none' },
    },
  })

  if (!content) return <p className="text-slate-400 text-sm italic">No description</p>
  return <EditorContent editor={editor} />
}
