'use client'

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Componente que renderiza HTML contendo marcações de LaTeX do Tiptap.
 * Ele identifica <span data-latex="..."></span> e substitui pelo HTML do KaTeX.
 */
export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const processedHtml = useMemo(() => {
    if (!content) return '';

    // Regex mais flexível para capturar o data-latex em qualquer posição do span
    const mathRegex = /<span[^>]*?data-latex="([^"]*?)"[^>]*?>([\s\S]*?)<\/span>/g;

    try {
      return content.replace(mathRegex, (match, latex) => {
        try {
          // Decodificar entidades HTML básicas se houver (ex: &quot; -> ")
          const decodedLatex = latex
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

          return katex.renderToString(decodedLatex, {
            throwOnError: false,
            displayMode: false,
          });
        } catch (err) {
          console.error('Erro ao renderizar KaTeX:', err);
          return `<span class="text-red-500 text-xs">[Erro TeX]</span>`;
        }
      });
    } catch (err) {
      console.error('Erro no processamento do HTML:', err);
      return content;
    }
  }, [content]);

  return (
    <div 
      className={`math-renderer-content break-words overflow-wrap-anywhere whitespace-pre-wrap w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
