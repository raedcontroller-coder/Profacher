'use client'

import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import ImageResize from 'tiptap-extension-resize-image'
import { MathExtension } from './MathExtension'
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
  isMath?: boolean;
}

const MenuBar = ({ editor, onImageUpload, isUploading, isMath, onMathClick }: { editor: any, onImageUpload: () => void, isUploading: boolean, isMath?: boolean, onMathClick?: () => void }) => {
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

  if (isMath) {
    items.push({
      type: 'divider',
    } as any)
    items.push({
      icon: <span className="material-symbols-outlined text-[18px]">calculate</span>,
      title: 'Inserir Equação com IA',
      action: () => onMathClick && onMathClick(),
      isActive: () => false,
      isGolden: true, 
    } as any);
  }


  return (
    <div className="space-y-2 mb-2 sticky top-0 z-20">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
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
              className={`p-2 rounded-xl transition-all outline-none focus:outline-none disabled:opacity-50 ${
                item.isGolden 
                  ? 'text-amber-500 hover:bg-transparent hover:text-amber-400 hover:scale-110' 
                  : item.isActive?.() 
                        ? 'bg-primary text-black hover:bg-primary hover:text-black' 
                        : 'text-gray-400 hover:bg-primary/20 hover:text-primary'
              }`}
            >
              {item.icon}
            </button>
          )
        ))}
      </div>
    </div>
  )
}

export default function RichTextEditor({ value, onChange, placeholder, isMath }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [showMathPrompt, setShowMathPrompt] = React.useState(false)
  const [mathInput, setMathInput] = React.useState('')
  const [isGeneratingMath, setIsGeneratingMath] = React.useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      MathExtension,
      (ImageResize.configure({
        HTMLAttributes: {
          class: 'rounded-2xl border border-white/10 my-4 max-w-full h-auto shadow-xl transition-all',
        },
      } as any) as any),
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

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Usar microtask para evitar erro de flushSync no React 18 durante o ciclo de renderização
      Promise.resolve().then(() => {
        if (editor && value !== editor.getHTML()) {
          editor.commands.setContent(value, { emitUpdate: false });
        }
      });
    }
  }, [value, editor]);

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
        // @ts-ignore
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

  const handleGenerateMath = async () => {
    if (!mathInput.trim() || !editor) return;
    setIsGeneratingMath(true);
    try {
      const { generateMathEquation } = await import('../../app/actions/aiAction');
      const res = await generateMathEquation(mathInput);
      if (res.success && res.latex) {
        // Tiptap processa a injeção do componente de View com o motor HTML de KaTeX
        editor.chain().focus().insertContent({ 
           type: 'math', 
           attrs: { latex: res.latex } 
        }).run();
        
        setShowMathPrompt(false);
        setMathInput('');
      } else {
        alert(res.error || "Erro ao processar equação");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao contatar API de cálculo matemático.");
    } finally {
      setIsGeneratingMath(false);
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
        isMath={isMath}
        onMathClick={() => setShowMathPrompt(!showMathPrompt)}
      />

      {showMathPrompt && (
        <div className="absolute z-30 ml-4 p-5 rounded-3xl bg-[#121315]/90 backdrop-blur-xl border border-white/10 shadow-2xl w-full max-w-lg mb-2">
           <div className="flex items-center gap-3 mb-3">
             <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
             <h4 className="font-bold text-sm text-primary uppercase tracking-widest">Transformador Matemático</h4>
           </div>
           <p className="text-xs text-gray-400 mb-4 font-mono leading-relaxed">
              Escreva como você leria o cálculo. A IA gerará a fórmula perfeita.<br/> 
              Ex: "função f de t igual a integral de 2 em r".
           </p>
           <textarea
             value={mathInput}
             onChange={e => setMathInput(e.target.value)}
             placeholder="Digite seu cálculo natural aqui..."
             className="w-full h-24 mb-3 bg-[#0d0e0f]/50 border border-white/5 rounded-2xl p-4 text-sm text-on-surface outline-none focus:border-primary transition-all resize-none"
             onKeyDown={(e) => {
               if(e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleGenerateMath();
               }
             }}
           />
           <div className="flex justify-end gap-3 rounded-2xl">
              <button 
                onClick={() => setShowMathPrompt(false)} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-white"
              >
                 Cancelar
              </button>
              <button 
                onClick={handleGenerateMath}
                disabled={isGeneratingMath || !mathInput.trim()}
                className="px-5 py-2 rounded-xl bg-primary text-black font-bold text-xs flex items-center gap-2 hover:brightness-110 disabled:opacity-50"
              >
                 {isGeneratingMath ? <Loader2 size={14} className="animate-spin" /> : <span className="material-symbols-outlined text-[14px]">psychology</span>}
                 {isGeneratingMath ? 'Processando...' : 'Gerar Equação'}
              </button>
           </div>
        </div>
      )}

      <div className={`bg-white/5 border border-outline-variant rounded-[2.5rem] overflow-hidden focus-within:border-primary transition-all group-hover/editor:border-white/20 relative`}>
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
          display: inline-block;
          float: none;
          max-width: 100% !important;
          height: auto;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .ProseMirror-selectednode img {
          outline: 3px solid #00F5D4;
        }

        .resizer {
          position: relative;
          display: inline-block;
          line-height: 0;
          max-width: 100% !important;
        }

        .resizer__handler {
          display: block;
          position: absolute;
          width: 12px;
          height: 12px;
          background: #00F5D4;
          border: 2px solid #000;
          border-radius: 50%;
          z-index: 10;
        }

        .resizer__handler--top-left { top: -6px; left: -6px; cursor: nwse-resize; }
        .resizer__handler--top-right { top: -6px; right: -6px; cursor: nesw-resize; }
        .resizer__handler--bottom-left { bottom: -6px; left: -6px; cursor: nesw-resize; }
        .resizer__handler--bottom-right { bottom: -6px; right: -6px; cursor: nwse-resize; }

        .resizer__image {
          max-width: 100% !important;
          height: auto !important;
        }
      `}</style>
    </div>
  )
}
