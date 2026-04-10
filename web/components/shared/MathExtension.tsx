import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import React, { useMemo } from 'react';

const MathComponent = ({ node, selected }: any) => {
  const { latex } = node.attrs;

  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || '', {
        throwOnError: false,
        displayMode: false,
      });
    } catch (e: any) {
      return `<span style="color: red; font-size: 12px;">[Erro TeX: ${e.message}]</span>`;
    }
  }, [latex]);

  return (
    <NodeViewWrapper 
      as="span" 
      className={`inline-block align-middle mx-1 cursor-default transition-all text-[1.4em] ${selected ? 'ring-2 ring-primary bg-primary/10 rounded-sm' : ''}`}
      contentEditable={false}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} className="math-rendered" />
    </NodeViewWrapper>
  );
};

export const MathExtension = Node.create({
  name: 'math',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex'),
        renderHTML: (attributes) => {
          return {
            'data-latex': attributes.latex,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-latex]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(HTMLAttributes, { 
        'data-latex': node.attrs.latex, 
        class: 'math-node' 
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  },
});
