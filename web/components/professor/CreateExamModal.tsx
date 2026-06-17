'use client'
import React from 'react';
import { useRouter } from 'next/navigation';

export default function CreateExamModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="liquid-glass border border-outline-variant rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
        
        <h3 className="text-2xl font-bold mb-2">Criar Nova Prova</h3>
        <p className="text-gray-400 mb-8">Selecione o tipo de prova que deseja criar.</p>

        <div className="grid gap-4">
          <button 
            onClick={() => router.push('/professor/new-exam')}
            className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">devices</span>
            </div>
            <div>
              <h4 className="font-bold text-lg group-hover:text-primary transition-colors">1 - Digital</h4>
              <p className="text-sm text-gray-400">Prova realizada online pelos alunos.</p>
            </div>
          </button>

          <button 
            onClick={() => router.push('/professor/new-physical-exam')}
            className="flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-secondary/10 hover:border-secondary/30 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <h4 className="font-bold text-lg group-hover:text-secondary transition-colors">2 - Física</h4>
              <p className="text-sm text-gray-400">Correção com IA para provas no papel.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
