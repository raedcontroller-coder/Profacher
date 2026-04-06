'use client'

import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  ImageIcon,
  Undo,
  Redo,
  Loader2
} from 'lucide-react'

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MenuBar = ({ editor, onImageUpload, isUploading }: { editor: any, onImageUpload: () => void, isUploading: boolean }) => {
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
      icon: isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />,
      title: 'Inserir Imagem',
      action: onImageUpload,
      isActive: () => false,
      disabled: isUploading
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
            disabled={item.disabled}
            onClick={(e) => {
                e.preventDefault();
                item.action();
            }}
            title={item.title}
            className={`p-2 rounded-xl transition-all hover:bg-primary/20 hover:text-primary disabled:opacity-50 ${
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-2xl border border-white/10 my-4 max-w-full h-auto shadow-xl',
        },
      }),
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.url) {
        editor.chain().focus().setImage({ src: data.url }).run()
      } else {
        alert('Erro ao fazer upload da imagem: ' + (data.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('Erro inesperado no servidor de imagens.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full group/editor">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleImageUpload}
      />
      
      <MenuBar 
        editor={editor} 
        onImageUpload={() => fileInputRef.current?.click()} 
        isUploading={isUploading}
      />

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
        .ProseMirror img {
          display: block;
          margin-left: auto;
          margin-right: auto;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .ProseMirror img:hover {
          transform: scale(1.01);
        }
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid #00F5D4;
        }
      `}</style>
    </div>
  )
}
