'use client'

import React, { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { saveExam } from './actions';
import { useRouter } from 'next/navigation';
import ImportQuestionModal from './ImportQuestionModal';

interface QuestionInput {
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
  points: number;
  referenceAnswer?: string;
  options: Array<{ content: string; isCorrect: boolean }>;
}

const typeOptions = [
  { value: 'MULTIPLE_CHOICE', label: 'Objetiva', icon: 'list_alt' },
  { value: 'TRUE_FALSE', label: 'V / F', icon: 'check_circle' },
  { value: 'ESSAY', label: 'Dissertativa', icon: 'notes' },
  { value: 'MATH', label: 'Cálculo', icon: 'functions' },
] as const;

export default function NewExamClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);

  function addQuestion() {
    setQuestions([...questions, {
      content: '',
      type: 'MULTIPLE_CHOICE',
      points: 1.0,
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ]
    }]);
  }

  function handleTypeChange(qIndex: number, newType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH") {
    const newQs = [...questions];
    newQs[qIndex].type = newType;
    
    if (newType === 'TRUE_FALSE') {
      newQs[qIndex].options = [
        { content: 'Verdadeiro', isCorrect: true },
        { content: 'Falso', isCorrect: false }
      ];
    } else if (newType === 'ESSAY' || newType === 'MATH') {
      newQs[qIndex].options = [];
    } else if (newType === 'MULTIPLE_CHOICE' && newQs[qIndex].options.length !== 4) {
      newQs[qIndex].options = [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ];
    }
    setQuestions(newQs);
  }

  function handleImportQuestions(importedQuestions: any[]) {
    const formatted: QuestionInput[] = importedQuestions.map(q => ({
      content: q.content,
      type: q.type,
      points: 1.0, // Pontuação padrão para itens importados
      referenceAnswer: q.referenceAnswer || '',
      options: q.options.map((opt: any) => ({
        content: opt.content,
        isCorrect: opt.isCorrect
      }))
    }));

    setQuestions([...questions, ...formatted]);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title) {
        alert("Por favor, insira o título da prova.");
        return;
    }
    if (questions.length === 0) {
        alert("Adicione ao menos uma questão.");
        return;
    }

    for (const q of questions) {
        if (!q.content.trim()) {
            alert("Todas as questões precisam de um enunciado.");
            return;
        }
        if ((q.type === 'ESSAY' || q.type === 'MATH') && !q.referenceAnswer?.trim()) {
            alert("Questões dissertativas ou de cálculo precisam de um Gabarito de Referência para a IA.");
            return;
        }
    }

    setLoading(true);
    try {
        const result = await saveExam({ title, description, questions });
        if (result.success) {
          alert("Prova salva com sucesso! Um grupo de questões com o nome desta prova foi criado automaticamente no seu banco.");
          router.push("/professor");
        } else {
          alert("Erro ao salvar: " + result.error);
        }
    } catch (e) {
        alert("Erro inesperado ao salvar.");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }} />
        <div className="fixed top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        
        <Sidebar role="PROFESSOR" />
        <TopBar userName={userName} roleLabel="Professor" />

        <main className="pl-64 pt-16 min-h-screen relative z-10">
            <div className="p-12 max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-700">
                
                <header className="flex justify-between items-center mb-4">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold tracking-tight text-on-surface">Nova <span className="text-primary">Avaliação</span></h2>
                        <p className="text-gray-400">Monte sua prova do zero e alimente seu acervo automaticamente.</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                          disabled={loading}
                          onClick={() => router.back()}
                          className="px-6 py-3 rounded-2xl border border-outline-variant hover:bg-white/5 transition-all font-bold text-gray-500"
                        >
                            Cancelar
                        </button>
                        <button 
                          disabled={loading}
                          onClick={handleSave}
                          className="px-10 py-3 rounded-2xl bg-primary text-black font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin material-symbols-outlined">sync</span>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">verified</span> 
                                    SALVAR PROVA
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <section className="space-y-6">
                    <div className="liquid-glass p-10 rounded-[3rem] border border-outline-variant space-y-8 animate-in slide-in-from-top-4 duration-500">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70 ml-1">Título do Exame</label>
                                <input 
                                  value={title} 
                                  onChange={e => setTitle(e.target.value)}
                                  placeholder="Ex: Simulado Mensal de Física"
                                  className="w-full bg-white/5 border border-outline-variant rounded-2xl p-6 text-3xl font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70 ml-1">Instruções para o Aluno (Opcional)</label>
                                <textarea 
                                  value={description} 
                                  onChange={e => setDescription(e.target.value)}
                                  placeholder="Ex: Não é permitido o uso de calculadora..."
                                  className="w-full bg-white/5 border border-outline-variant rounded-2xl p-6 outline-none focus:border-primary transition-all h-32 resize-none text-gray-300"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-8 pb-32">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                           Conteúdo da Prova
                           <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">{questions.length} itens</span>
                        </h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 bg-white/5 text-gray-400 px-6 py-3 rounded-2xl font-bold hover:bg-white/10 hover:text-on-surface transition-all group border border-outline-variant"
                            >
                                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">inventory_2</span> 
                                Importar do Banco
                            </button>
                            <button 
                                onClick={addQuestion}
                                className="flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-2xl font-bold hover:bg-primary hover:text-black transition-all group"
                            >
                                <span className="material-symbols-outlined group-hover:scale-125 transition-transform">add_circle</span> 
                                Adicionar Questão
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {questions.map((q, qIndex) => (
                          <div key={qIndex} className="liquid-glass p-12 rounded-[4rem] border border-outline-variant relative group/card animate-in slide-in-from-bottom-5 duration-700 hover:border-primary/30 transition-all">
                             <button 
                                onClick={() => removeQuestion(qIndex)}
                                className="absolute top-10 right-10 text-gray-600 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-all opacity-0 group-hover/card:opacity-100"
                             >
                                <span className="material-symbols-outlined">delete</span>
                             </button>

                             <div className="space-y-10">
                                {/* Header da Questão: Número, Pontuação e Tipo */}
                                <div className="flex items-center gap-8 border-b border-white/5 pb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary text-xl shadow-inner shrink-0">
                                        {qIndex + 1}
                                    </div>
                                    
                                    <div className="flex items-center gap-8 flex-1">
                                        {/* Pontuação */}
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gray-500 text-lg">star</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pontuação:</span>
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                className="w-16 bg-white/5 border border-outline-variant rounded-xl p-2.5 text-center font-bold text-primary outline-none focus:border-primary transition-all"
                                                value={q.points}
                                                onChange={e => {
                                                    const newQs = [...questions];
                                                    newQs[qIndex].points = parseFloat(e.target.value);
                                                    setQuestions(newQs);
                                                }}
                                            />
                                        </div>

                                        <div className="h-4 w-[1px] bg-white/10 hidden md:block" />

                                        {/* Seletor de Tipo */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-gray-500 text-lg">category</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {typeOptions.map(opt => (
                                                    <button 
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => handleTypeChange(qIndex, opt.value)}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${q.type === opt.value ? 'bg-primary text-black border-primary' : 'bg-white/5 border-outline-variant text-gray-500 hover:border-primary/40 hover:text-primary'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Corpo da Questão */}
                                <div className="space-y-8">
                                    <textarea 
                                        placeholder="Clique aqui para digitar o enunciado da questão..."
                                        className="w-full bg-transparent text-2xl font-medium outline-none border-b border-outline-variant focus:border-primary py-4 min-h-[120px] resize-none transition-all placeholder:text-gray-700"
                                        value={q.content}
                                        onChange={e => {
                                            const newQs = [...questions];
                                            newQs[qIndex].content = e.target.value;
                                            setQuestions(newQs);
                                        }}
                                    />

                                    {/* Gabarito de Referência para Dissertativas */}
                                    {(q.type === 'ESSAY' || q.type === 'MATH') && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 bg-amber-500/5 p-8 rounded-[2rem] border border-amber-500/10">
                                            <div className="flex items-center gap-3 text-amber-500">
                                                <span className="material-symbols-outlined">auto_fix_high</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Gabarito de Referência (Obrigatório para IA)</span>
                                            </div>
                                            <textarea 
                                                placeholder="Digite aqui a resposta que você espera do aluno. A IA usará este texto para comparar com a resposta dele."
                                                className="w-full bg-white/5 border border-amber-500/20 rounded-2xl p-6 text-sm text-amber-100 outline-none focus:border-amber-500/50 transition-all h-32 resize-none shadow-inner placeholder:text-amber-500/30"
                                                value={q.referenceAnswer || ''}
                                                onChange={e => {
                                                    const newQs = [...questions];
                                                    newQs[qIndex].referenceAnswer = e.target.value;
                                                    setQuestions(newQs);
                                                }}
                                            />
                                            <div className="flex items-center gap-3 text-[10px] text-amber-500/60 italic px-2">
                                                <span className="material-symbols-outlined text-sm">info</span>
                                                A IA não buscará a resposta correta por conta própria. Ela comparará a resposta do aluno estritamente com o seu gabarito.
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Alternativas para Objetivas */}
                                    {q.type !== 'ESSAY' && q.type !== 'MATH' && (
                                        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                                    {q.type === 'TRUE_FALSE' ? 'Selecione a resposta correta' : 'Defina as alternativas (marque a correta)'}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-4 group/opt">
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newQs = [...questions];
                                                            newQs[qIndex].options = newQs[qIndex].options.map((o, idx) => ({ ...o, isCorrect: idx === oIndex }));
                                                            setQuestions(newQs);
                                                        }}
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all font-bold shrink-0 ${opt.isCorrect ? 'bg-primary text-black border-primary scale-110 shadow-lg shadow-primary/20' : 'border-outline-variant text-gray-600 hover:border-primary/50'}`}
                                                    >
                                                        {opt.isCorrect ? (
                                                            <span className="material-symbols-outlined">done</span>
                                                        ) : (
                                                            String.fromCharCode(65 + oIndex)
                                                        )}
                                                    </button>
                                                    <input 
                                                        readOnly={q.type === 'TRUE_FALSE'}
                                                        className={`flex-1 bg-white/5 border rounded-2xl p-5 outline-none transition-all ${opt.isCorrect ? 'border-primary/40 text-on-surface font-bold' : 'border-outline-variant focus:border-primary text-gray-400'}`}
                                                        value={opt.content}
                                                        onChange={e => {
                                                            const newQs = [...questions];
                                                            newQs[qIndex].options[oIndex].content = e.target.value;
                                                            setQuestions(newQs);
                                                        }}
                                                        placeholder={`Texto da alternativa ${String.fromCharCode(65 + oIndex)}...`}
                                                    />
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </div>
                          </div>
                        ))}
                    </div>

                    {questions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-40 liquid-glass rounded-[5rem] border-2 border-dashed border-outline-variant opacity-30 mt-10">
                            <span className="material-symbols-outlined text-[120px]">edit_note</span>
                            <p className="text-2xl font-bold mt-6">Sua prova está em branco</p>
                            <button onClick={addQuestion} className="mt-6 text-primary font-bold hover:underline decoration-primary/30 underline-offset-8">Comece adicionando a primeira questão</button>
                        </div>
                    )}
                </section>
            </div>
            
            <ImportQuestionModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportQuestions}
            />
        </main>
    </div>
  );
}
