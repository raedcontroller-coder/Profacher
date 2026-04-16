'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { saveExam } from './actions';
import { useRouter } from 'next/navigation';
import ImportQuestionModal from './ImportQuestionModal';
import RichTextEditor from '@/components/shared/RichTextEditor';

const CODE_SEPARATOR = '<!-- PROFACHER_CODE_SEPARATOR -->';

interface QuestionInput {
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH" | "CUSTOM_HTML";
  points: number;
  referenceAnswer?: string;
  correctionMode?: "COMPARATIVE" | "CONCEPTUAL";
  options: Array<{ content: string; isCorrect: boolean }>;
}

const typeOptions = [
  { value: 'MULTIPLE_CHOICE', label: 'Objetiva', icon: 'list_alt' },
  { value: 'TRUE_FALSE', label: 'V / F', icon: 'check_circle' },
  { value: 'ESSAY', label: 'Dissertativa', icon: 'notes' },
  { value: 'MATH', label: 'Cálculo', icon: 'functions' },
  { value: 'CUSTOM_HTML', label: 'Interativa (HTML/JS)', icon: 'html' },
] as const;

export default function NewExamClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showScore, setShowScore] = useState(false);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [saveToBank, setSaveToBank] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  // Estados para Prévia Interativa (INDEXADOS POR QUESTÃO)
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [capturedAnswers, setCapturedAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    const handleTestMessage = (event: MessageEvent) => {
      if (event.data?.type === 'profacher_answer') {
        const { answer } = event.data;
        if (typeof event.data.index === 'number') {
            setCapturedAnswers(prev => ({ ...prev, [event.data.index]: answer }));
        }
      }
    };
    window.addEventListener('message', handleTestMessage);
    return () => window.removeEventListener('message', handleTestMessage);
  }, []);

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
      ],
      correctionMode: 'CONCEPTUAL'
    }]);
  }

  function handleTypeChange(qIndex: number, newType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH" | "CUSTOM_HTML") {
    const newQs = [...questions];
    newQs[qIndex].type = newType;
    
    if (newType === 'TRUE_FALSE') {
      newQs[qIndex].options = [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: true }
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
    } else if (newType === 'CUSTOM_HTML') {
      newQs[qIndex].options = [];
      // Se mudar para interativa, garantimos que tenha ao menos o separador se estiver vazio
      if (!newQs[qIndex].content.includes(CODE_SEPARATOR)) {
          newQs[qIndex].content = `${CODE_SEPARATOR}${newQs[qIndex].content}`;
      }
    }
    setQuestions(newQs);
  }

  function addOption(qIndex: number) {
    const newQs = [...questions];
    newQs[qIndex].options.push({ content: '', isCorrect: false });
    setQuestions(newQs);
  }

  function removeOption(qIndex: number, oIndex: number) {
    const newQs = [...questions];
    newQs[qIndex].options = newQs[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(newQs);
  }

  function handleImportQuestions(importedQuestions: any[]) {
    const formatted: QuestionInput[] = importedQuestions.map(q => ({
      content: q.content,
      type: q.type,
      points: 1.0, 
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
        const [enunc, code] = q.type === 'CUSTOM_HTML' 
            ? (q.content.includes(CODE_SEPARATOR) ? q.content.split(CODE_SEPARATOR) : ["", q.content])
            : [q.content, ""];

        if (!enunc.trim() && q.type !== 'CUSTOM_HTML') {
            alert("Todas as questões precisam de um enunciado.");
            return;
        }
        if (q.type === 'CUSTOM_HTML' && !code.trim()) {
            alert("Questões interativas precisam de código HTML/JS.");
            return;
        }
        if ((q.type === 'ESSAY' || q.type === 'MATH' || q.type === 'CUSTOM_HTML') && !q.referenceAnswer?.trim()) {
            alert("Questões dissertativas, cálculo ou interativas precisam de um Gabarito de Referência para a IA.");
            return;
        }
    }

    setLoading(true);
    try {
        const result = await saveExam({ title, description, showScore, randomizeOrder, saveToBank, questions });
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

                        {/* Configurações da Prova */}
                        <div className="pt-6 border-t border-white/5 space-y-6">
                            <div className="flex items-center justify-between bg-primary/5 p-6 rounded-2xl border border-primary/20 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">assessment</span>
                                        <span className="font-bold text-on-surface">Pontuação Total da Prova</span>
                                    </div>
                                    <p className="text-sm text-gray-500">Soma automática de todos os pontos atribuídos às questões.</p>
                                </div>
                                <div className="text-3xl font-black text-primary">
                                    {totalPoints.toFixed(1)}
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => setShowScore(!showScore)}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined ${showScore ? 'text-primary' : 'text-gray-500'}`}>
                                            {showScore ? 'visibility' : 'visibility_off'}
                                        </span>
                                        <span className="font-bold text-on-surface">Feedback de Nota em Tempo Real</span>
                                    </div>
                                    <p className="text-sm text-gray-500">O aluno ao entregar a prova vai poder ver em tempo real quanto ele tirou.</p>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${showScore ? 'bg-primary' : 'bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${showScore ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => setRandomizeOrder(!randomizeOrder)}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined ${randomizeOrder ? 'text-primary' : 'text-gray-500'}`}>
                                            {randomizeOrder ? 'shuffle' : 'sort'}
                                        </span>
                                        <span className="font-bold text-on-surface">Ordem aleatória</span>
                                    </div>
                                    <p className="text-sm text-gray-500">Cada aluno receberá as questões em uma ordem diferente.</p>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${randomizeOrder ? 'bg-primary' : 'bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${randomizeOrder ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => setSaveToBank(!saveToBank)}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined ${saveToBank ? 'text-primary' : 'text-gray-500'}`}>
                                            {saveToBank ? 'inventory_2' : 'inventory'}
                                        </span>
                                        <span className="font-bold text-on-surface">Salvar no Banco de Questões</span>
                                    </div>
                                    <p className="text-sm text-gray-500">As questões desta prova serão salvas no seu banco para uso futuro em outras avaliações.</p>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${saveToBank ? 'bg-primary' : 'bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 transform ${saveToBank ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-8 pb-32">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                           Conteúdo da Prova
                           <span className="text-xs font-mono bg-primary/5 border border-white/5 text-primary px-3 py-1 rounded-full">{questions.length} itens</span>
                        </h3>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 bg-white/5 text-gray-400 px-6 py-3 rounded-2xl font-bold hover:bg-white/10 hover:text-on-surface transition-all group border border-outline-variant"
                            >
                                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">inventory_2</span> 
                                Importar
                            </button>
                            <button 
                                onClick={addQuestion}
                                className="flex items-center gap-2 bg-primary/5 border border-white/5 text-primary px-6 py-3 rounded-2xl font-bold hover:bg-primary hover:text-black transition-all group"
                            >
                                <span className="material-symbols-outlined group-hover:scale-125 transition-transform">add_circle</span> 
                                Nova Questão
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {questions.map((q, qIndex) => {
                          const [enunc, code] = q.type === 'CUSTOM_HTML' 
                            ? (q.content.includes(CODE_SEPARATOR) ? q.content.split(CODE_SEPARATOR) : ["", q.content])
                            : [q.content, ""];

                          return (
                            <div key={qIndex} className="liquid-glass p-12 rounded-[4rem] border border-outline-variant relative group/card animate-in slide-in-from-bottom-5 duration-700 hover:border-primary/30 transition-all">
                                <button 
                                    onClick={() => removeQuestion(qIndex)}
                                    className="absolute top-10 right-10 text-gray-600 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/5 transition-all opacity-0 group-hover/card:opacity-100"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>

                                <div className="space-y-10">
                                    <div className="flex items-center gap-8 border-b border-white/5 pb-8">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-white/5 flex items-center justify-center font-bold text-primary text-xl shadow-inner shrink-0">
                                            {qIndex + 1}
                                        </div>
                                        
                                        <div className="flex items-center gap-8 flex-1">
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

                                    <div className="space-y-8">
                                        {q.type === 'CUSTOM_HTML' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center gap-3 text-primary/70">
                                                    <span className="material-symbols-outlined text-sm">subject</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Enunciado Opcional (Acima do Código)</span>
                                                </div>
                                                <RichTextEditor 
                                                    value={enunc}
                                                    onChange={(val) => {
                                                        const newQs = [...questions];
                                                        newQs[qIndex].content = `${val}${CODE_SEPARATOR}${code}`;
                                                        setQuestions(newQs);
                                                    }}
                                                    placeholder="Instruções para o aluno encontrar a resposta no componente interativo..."
                                                    isMath={false}
                                                />
                                            </div>
                                        )}

                                        {q.type === 'CUSTOM_HTML' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-primary">
                                                        <span className="material-symbols-outlined">code</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-primary/70">Código HTML/JS Interativo</span>
                                                    </div>
                                                </div>
                                                <textarea 
                                                    value={code}
                                                    onChange={(e) => {
                                                        const newQs = [...questions];
                                                        newQs[qIndex].content = `${enunc}${CODE_SEPARATOR}${e.target.value}`;
                                                        setQuestions(newQs);
                                                    }}
                                                    placeholder="<!DOCTYPE html>... Seu código interativo aqui."
                                                    className="w-full bg-[#0d0e0f]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-sm font-mono text-cyan-400 outline-none focus:border-primary/50 transition-all min-h-[400px] resize-y custom-scrollbar"
                                                    spellCheck={false}
                                                />
                                                
                                                <div className="flex flex-col gap-6 p-8 rounded-[3rem] bg-cyan-500/5 border border-cyan-500/10 mt-6 shadow-inner">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500/70">Ambiente de Teste Local</span>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setPreviews(prev => ({ ...prev, [qIndex]: code }));
                                                                setCapturedAnswers(prev => ({ ...prev, [qIndex]: null }));
                                                            }}
                                                            className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-black font-bold rounded-xl hover:brightness-110 transition-all text-xs"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">play_circle</span>
                                                            RENDERIZAR PRÉVIA
                                                        </button>
                                                    </div>

                                                    {previews[qIndex] && (
                                                        <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                                            <div className="relative h-[650px] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                                                <iframe 
                                                                    title={`preview-q-${qIndex}`}
                                                                    className="w-full h-full border-none"
                                                                    sandbox="allow-scripts allow-modals allow-popups"
                                                                    srcDoc={`
                                                                        <!DOCTYPE html>
                                                                        <html>
                                                                        <head>
                                                                            <style>body { margin: 0; padding: 0; background: transparent; overflow: hidden; }</style>
                                                                        </head>
                                                                        <body>
                                                                            <script>
                                                                                window.setAnswer = function(val) {
                                                                                    window.parent.postMessage({ 
                                                                                        type: 'profacher_answer', 
                                                                                        index: ${qIndex},
                                                                                        answer: val 
                                                                                    }, '*');
                                                                                };
                                                                            </script>
                                                                            ${previews[qIndex]}
                                                                        </body>
                                                                        </html>
                                                                    `}
                                                                />
                                                            </div>
                                                            
                                                            <div className={`p-6 rounded-2xl border transition-all flex items-center justify-between ${capturedAnswers[qIndex] !== undefined && capturedAnswers[qIndex] !== null ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/5 border-white/10'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="material-symbols-outlined text-cyan-400">sensors</span>
                                                                    <span className="text-xs font-bold uppercase tracking-tight text-gray-400">Resposta Capturada:</span>
                                                                </div>
                                                                <div className="text-xl font-mono font-black text-cyan-400">
                                                                    {capturedAnswers[qIndex] !== undefined && capturedAnswers[qIndex] !== null ? String(capturedAnswers[qIndex]) : "Aguardando interação..."}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <RichTextEditor 
                                                value={q.content}
                                                onChange={(val) => {
                                                    const newQs = [...questions];
                                                    newQs[qIndex].content = val;
                                                    setQuestions(newQs);
                                                }}
                                                placeholder="Clique aqui para digitar o enunciado da questão..."
                                                isMath={q.type === 'MATH'}
                                            />
                                        )}

                                        {(q.type === 'ESSAY' || q.type === 'MATH' || q.type === 'CUSTOM_HTML') && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 bg-amber-500/5 p-8 rounded-[2rem] border border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-amber-500">
                                                        <span className="material-symbols-outlined">auto_fix_high</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Gabarito de Referência (IA)</span>
                                                    </div>
                                                    
                                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newQs = [...questions];
                                                                newQs[qIndex].correctionMode = 'CONCEPTUAL';
                                                                setQuestions(newQs);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${q.correctionMode === 'CONCEPTUAL' || !q.correctionMode ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-amber-500/70'}`}
                                                        >
                                                            CONCEITUAL
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newQs = [...questions];
                                                                newQs[qIndex].correctionMode = 'COMPARATIVE';
                                                                setQuestions(newQs);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${q.correctionMode === 'COMPARATIVE' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-amber-500/70'}`}
                                                        >
                                                            COMPARATIVA
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-[9px] text-amber-500/40 leading-relaxed">
                                                    {q.correctionMode === 'COMPARATIVE' 
                                                        ? "Rigorosa: A IA comparará a escrita e os termos literais do aluno."
                                                        : "Inteligente: A IA focará na essência da ideia e nas instruções do gabarito."}
                                                </p>
                                                <textarea 
                                                    placeholder={q.type === 'CUSTOM_HTML' ? "Qual é o valor esperado da interação? Ex: 2021 | 50. A IA usará isso para avaliar a resposta capturada." : "Digite aqui a resposta que você espera do aluno. A IA usará este texto para comparar com a resposta dele."}
                                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-sm text-amber-100 outline-none focus:border-amber-500/50 transition-all h-32 resize-none shadow-inner placeholder:text-amber-500/30"
                                                    value={q.referenceAnswer || ''}
                                                    onChange={e => {
                                                        const newQs = [...questions];
                                                        newQs[qIndex].referenceAnswer = e.target.value;
                                                        setQuestions(newQs);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        
                                        {q.type !== 'ESSAY' && q.type !== 'MATH' && q.type !== 'CUSTOM_HTML' && (
                                            <div className="space-y-6 pt-4 animate-in fade-in duration-500">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                                        {q.type === 'TRUE_FALSE' ? 'Defina as afirmações e seus gabaritos (V/F)' : 'Defina as alternativas (marque a correta)'}
                                                    </p>
                                                    <button 
                                                        onClick={() => addOption(qIndex)}
                                                        className="text-xs font-bold text-primary flex items-center gap-2 hover:underline"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">add_circle</span>
                                                        {q.type === 'TRUE_FALSE' ? 'Adicionar Afirmação' : 'Adicionar Alternativa'}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-6">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-4 group/opt">
                                                        {q.type === 'TRUE_FALSE' ? (
                                                            <div className="flex gap-2 shrink-0">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newQs = [...questions];
                                                                        newQs[qIndex].options[oIndex].isCorrect = true;
                                                                        setQuestions(newQs);
                                                                    }}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all font-bold ${opt.isCorrect ? 'bg-green-500 text-black border-green-500 scale-110 shadow-lg shadow-green-500/20' : 'border-outline-variant text-gray-600 hover:border-green-500/50'}`}
                                                                >
                                                                    V
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newQs = [...questions];
                                                                        newQs[qIndex].options[oIndex].isCorrect = false;
                                                                        setQuestions(newQs);
                                                                    }}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all font-bold ${!opt.isCorrect ? 'bg-red-500 text-black border-red-500 scale-110 shadow-lg shadow-red-500/20' : 'border-outline-variant text-gray-600 hover:border-red-500/50'}`}
                                                                >
                                                                    F
                                                                </button>
                                                            </div>
                                                        ) : (
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
                                                        )}
                                                        
                                                        <input 
                                                            className={`flex-1 bg-white/5 border rounded-2xl p-5 outline-none transition-all ${opt.isCorrect ? 'border-primary/40 text-on-surface font-bold' : 'border-outline-variant focus:border-primary text-gray-400'}`}
                                                            value={opt.content}
                                                            onChange={e => {
                                                                const newQs = [...questions];
                                                                newQs[qIndex].options[oIndex].content = e.target.value;
                                                                setQuestions(newQs);
                                                            }}
                                                            placeholder={q.type === 'TRUE_FALSE' ? "Digite a afirmação..." : `Texto da alternativa ${String.fromCharCode(65 + oIndex)}...`}
                                                        />
                                                        
                                                        {q.options.length > 2 && (
                                                            <button 
                                                                onClick={() => removeOption(qIndex, oIndex)}
                                                                className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                                            >
                                                                <span className="material-symbols-outlined">close</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex justify-center gap-4 pt-12 animate-in fade-in slide-in-from-top-4 duration-500">
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 bg-white/5 text-gray-400 px-8 py-4 rounded-3xl font-bold hover:bg-white/10 hover:text-on-surface transition-all group border border-outline-variant shadow-lg"
                        >
                            <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">inventory_2</span> 
                            Importar do Banco
                        </button>
                        <button 
                            onClick={addQuestion}
                            className="flex items-center gap-2 bg-primary text-black px-10 py-4 rounded-3xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 group"
                        >
                            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add_circle</span> 
                            ADICIONAR NOVA QUESTÃO
                        </button>
                    </div>

                    {questions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 liquid-glass rounded-[5rem] border-2 border-dashed border-outline-variant opacity-40 mt-10 text-center">
                            <span className="material-symbols-outlined text-[120px] text-gray-600">edit_note</span>
                            <p className="text-2xl font-bold mt-6 text-gray-500 font-mono tracking-tighter uppercase opacity-50">Sua prova está em branco</p>
                            <p className="text-sm text-gray-600 mt-2">Escolha uma opção acima ou no final da página para começar</p>
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
