'use client'

import React, { useEffect, useState } from 'react';
import { getTeacherQuestions } from './actions';

interface Question {
  id: number;
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
  referenceAnswer?: string;
  options: Array<{ content: string; isCorrect: boolean }>;
}

interface QuestionGroup {
  id: number;
  name: string;
  description?: string;
  questions: Question[];
}

interface ImportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Question[]) => void;
}

export default function ImportQuestionModal({ isOpen, onClose, onImport }: ImportQuestionModalProps) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen]);

  async function loadQuestions() {
    setLoading(true);
    const result = await getTeacherQuestions();
    if (result.success && result.groups) {
      setGroups(result.groups as any);
    }
    setLoading(false);
  }

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleQuestion = (questionId: number) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const toggleSelectAllInGroup = (group: QuestionGroup) => {
    const groupQuestionIds = group.questions.map(q => q.id);
    const allSelected = groupQuestionIds.every(id => selectedQuestionIds.includes(id));

    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !groupQuestionIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => [...new Set([...prev, ...groupQuestionIds])]);
    }
  };

  const handleConfirmImport = () => {
    const questionsToImport: Question[] = [];
    groups.forEach(group => {
      group.questions.forEach(q => {
        if (selectedQuestionIds.includes(q.id)) {
          questionsToImport.push(q);
        }
      });
    });
    onImport(questionsToImport);
    onClose();
    setSelectedQuestionIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="liquid-glass w-full max-w-4xl max-h-[80vh] flex flex-col rounded-[3rem] border border-outline-variant overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Importar do Banco</h2>
            <p className="text-sm text-gray-400 mt-1">Selecione questões do seu acervo para adicionar à prova.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <span className="material-symbols-outlined text-5xl mb-4 text-primary">inventory_2</span>
              <p className="text-gray-500 font-medium">Carregando seu banco de questões...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20 grayscale opacity-50">
              <span className="material-symbols-outlined text-6xl mb-4">folder_off</span>
              <p className="text-xl font-bold">Nenhum grupo encontrado</p>
              <p className="text-sm">Você ainda não possui questões arquivadas no banco.</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.id} className="border border-white/5 rounded-[2rem] overflow-hidden transition-all bg-white/[0.02] hover:bg-white/[0.04]">
                <div 
                  className="p-6 flex items-center gap-4 cursor-pointer select-none"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div 
                    className="w-6 h-6 border-2 border-outline-variant rounded flex items-center justify-center transition-all hover:border-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAllInGroup(group);
                    }}
                  >
                    {group.questions.every(q => selectedQuestionIds.includes(q.id)) && group.questions.length > 0 && (
                      <span className="material-symbols-outlined text-primary text-lg">check</span>
                    )}
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${expandedGroups.includes(group.id) ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.questions.length} questões</p>
                  </div>
                </div>

                {expandedGroups.includes(group.id) && (
                  <div className="px-10 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    {group.questions.map(q => (
                      <div 
                        key={q.id} 
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedQuestionIds.includes(q.id) ? 'bg-primary/5 border-primary/30' : 'border-white/5 hover:border-white/10'}`}
                        onClick={() => toggleQuestion(q.id)}
                      >
                         <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${selectedQuestionIds.includes(q.id) ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                            {selectedQuestionIds.includes(q.id) && (
                              <span className="material-symbols-outlined text-black text-sm">done</span>
                            )}
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <p className="text-sm line-clamp-2 text-gray-300 italic">"{q.content}"</p>
                            <div className="flex gap-2 mt-2">
                               <span className="text-[9px] uppercase font-bold tracking-widest bg-white/10 px-2 py-0.5 rounded text-gray-400">
                                  {q.type === 'MULTIPLE_CHOICE' ? 'Objetiva' : q.type === 'TRUE_FALSE' ? 'V/F' : q.type === 'ESSAY' ? 'Dissertativa' : 'Cálculo'}
                               </span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <footer className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-outline-variant hover:bg-white/5 transition-all text-gray-500 font-bold"
          >
            Cancelar
          </button>
          <button 
            disabled={selectedQuestionIds.length === 0}
            onClick={handleConfirmImport}
            className="px-8 py-2.5 rounded-xl bg-primary text-black font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">download</span>
            Importar {selectedQuestionIds.length} selecionadas
          </button>
        </footer>
      </div>
    </div>
  );
}
