'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Quote,
  Undo,
  Redo
} from 'lucide-react'

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const items = [
    {
      icon: <Bold size={18} />,
      title: 'Negrito',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Italic size={18} />,
      title: 'Itálico',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <UnderlineIcon size={18} />,
      title: 'Sublinhado',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive('underline'),
    },
    {
      type: 'divider',
    },
    {
      icon: <List size={18} />,
      title: 'Lista',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered size={18} />,
      title: 'Lista Numerada',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
        type: 'divider',
    },
    {
      icon: <Undo size={18} />,
      title: 'Desfazer',
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: <Redo size={18} />,
      title: 'Refazer',
      action: () => editor.chain().focus().redo().run(),
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 mb-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md sticky top-0 z-20">
      {items.map((item: any, index) => (
        item.type === 'divider' ? (
          <div key={index} className="w-[1px] h-6 bg-white/10 mx-1" />
        ) : (
          <button
            key={index}
            onClick={(e) => {
                e.preventDefault();
                item.action();
            }}
            title={item.title}
            className={`p-2 rounded-xl transition-all hover:bg-primary/20 hover:text-primary ${
              item.isActive?.() ? 'bg-primary text-black hover:bg-primary hover:text-black' : 'text-gray-400'
            }`}
          >
            {item.icon}
          </button>
        )
      ))}
    </div>
  )
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    immediatelyRender: false,
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[120px] text-lg text-on-surface p-4 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sincronizar valor externo se necessário (ex: importação do banco)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div className="w-full group/editor">
      <MenuBar editor={editor} />
      <div className="bg-white/5 border border-outline-variant rounded-[2.5rem] overflow-hidden focus-within:border-primary transition-all group-hover/editor:border-white/20 relative">
        <EditorContent editor={editor} />
        {!editor?.getText() && placeholder && (
            <div className="absolute top-4 left-4 pointer-events-none text-gray-700 text-lg transition-opacity">
                {placeholder}
            </div>
        )}
      </div>
      
      <style jsx global>{`
        .ProseMirror p {
           margin-bottom: 0.5em;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #ccc;
          padding-left: 1em;
          font-style: italic;
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}
