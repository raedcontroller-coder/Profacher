'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { 
    getQuestionGroups, 
    createQuestionGroup, 
    deleteQuestionGroup, 
    getGroupWithQuestions,
    createQuestionInBank, 
    deleteQuestionInBank,
    updateQuestionInBank
} from './actions';
import RichTextEditor from '@/components/shared/RichTextEditor';

const CODE_SEPARATOR = '<!-- PROFACHER_CODE_SEPARATOR -->';

interface QuestionOption {
    id: number;
    content: string;
    isCorrect: boolean;
}

interface Question {
    id: number;
    content: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH" | "CUSTOM_HTML";
    points: number;
    referenceAnswer?: string;
    options: QuestionOption[];
}

interface QuestionGroup {
    id: number;
    name: string;
    description?: string;
    questions: Question[];
    updatedAt: string;
}

const typeOptions = [
    { value: 'MULTIPLE_CHOICE', label: 'Objetiva', icon: 'list_alt' },
    { value: 'TRUE_FALSE', label: 'Verdadeiro ou Falso', icon: 'check_circle' },
    { value: 'ESSAY', label: 'Dissertativa', icon: 'notes' },
    { value: 'MATH', label: 'Cálculo (Matemática)', icon: 'functions' },
    { value: 'CUSTOM_HTML', label: 'Interativa (HTML/JS)', icon: 'html' },
] as const;

export default function QuestionsClient({ userName }: { userName: string }) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Estados da Visão de Detalhes (Dentro do Grupo)
  const [viewingGroupId, setViewingGroupId] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<QuestionGroup | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  
  // Estados da Nova Questão / Edição
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH" | "CUSTOM_HTML">('MULTIPLE_CHOICE');
  const [qPoints, setQPoints] = useState(1.0);
  const [qReferenceAnswer, setQReferenceAnswer] = useState('');
  const [qInteractiveCode, setQInteractiveCode] = useState('');
  const [qOptions, setQOptions] = useState<Array<{ content: string; isCorrect: boolean }>>([
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false }
  ]);
  
  // Estados para Prévia Interativa
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [capturedTestAnswer, setCapturedTestAnswer] = useState<any>(null);

  useEffect(() => {
    const handleTestMessage = (event: MessageEvent) => {
      if (event.data?.type === 'profacher_answer') {
        setCapturedTestAnswer(event.data.answer);
      }
    };
    window.addEventListener('message', handleTestMessage);
    return () => window.removeEventListener('message', handleTestMessage);
  }, []);

  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    const result = await getQuestionGroups();
    if (result.success) {
      setGroups(result.groups as any);
    }
    setLoading(false);
  }

  async function handleCreateGroup() {
    const name = prompt("Nome do Grupo:");
    if (!name) return;
    const res = await createQuestionGroup({ name });
    if (res.success) {
      loadGroups();
    }
  }

  async function handleDeleteGroup(id: number) {
    if (confirm("Deseja realmente excluir este grupo e todas as questões contidas nele?")) {
      const res = await deleteQuestionGroup(id);
      if (res.success) {
        await loadGroups();
      }
    }
  }

  async function loadGroup(id: number) {
    setIsContentLoading(true);
    try {
        const fullGroup = await getGroupWithQuestions(id);
        setActiveGroup(fullGroup as any);
    } catch (e) {
        alert("Erro ao carregar conteúdo do grupo.");
    } finally {
        setIsContentLoading(false);
    }
  }

  async function enterGroup(id: number) {
    setViewingGroupId(id);
    loadGroup(id);
  }

  function exitGroup() {
    setViewingGroupId(null);
    setActiveGroup(null);
    resetQuestionForm();
    loadGroups();
  }

  // --- Handlers de Questão ---
  function resetQuestionForm() {
    setQContent('');
    setQInteractiveCode('');
    setQType('MULTIPLE_CHOICE');
    setQPoints(1.0);
    setQReferenceAnswer('');
    setQOptions([
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false }
    ]);
    setEditingQuestionId(null);
    setShowNewQuestionForm(false);
    setPreviewContent(null);
    setCapturedTestAnswer(null);
  }

  function addOption() {
    setQOptions([...qOptions, { content: '', isCorrect: false }]);
  }

  function removeOption(idx: number) {
    setQOptions(qOptions.filter((_, i) => i !== idx));
  }

  function handleEditQuestion(q: any) {
    setEditingQuestionId(q.id);
    setQType(q.type);
    
    if (q.type === 'CUSTOM_HTML' && q.content.includes(CODE_SEPARATOR)) {
        const parts = q.content.split(CODE_SEPARATOR);
        setQContent(parts[0]);
        setQInteractiveCode(parts[1]);
    } else if (q.type === 'CUSTOM_HTML') {
        setQContent('');
        setQInteractiveCode(q.content);
    } else {
        setQContent(q.content);
        setQInteractiveCode('');
    }

    setQPoints(q.points);
    setQReferenceAnswer(q.referenceAnswer || '');
    if (q.options) {
      setQOptions(q.options.map((opt: any) => ({ content: opt.content, isCorrect: opt.isCorrect })));
    }
    setShowNewQuestionForm(true);
  }

  async function handleDeleteQuestion(id: number) {
    if (confirm("Excluir esta questão permanentemente?")) {
      const res = await deleteQuestionInBank(id);
      if (res.success) {
        loadGroup(viewingGroupId!);
      }
    }
  }

  async function handleSaveQuestion() {
    if (!qContent && qType !== 'CUSTOM_HTML') {
      alert("Escreva o enunciado.");
      return;
    }
    if (qType === 'CUSTOM_HTML' && !qInteractiveCode) {
        alert("O código HTML/JS é obrigatório para questões interativas.");
        return;
    }

    setIsSavingQuestion(true);

    const finalContent = qType === 'CUSTOM_HTML' 
        ? `${qContent}${CODE_SEPARATOR}${qInteractiveCode}` 
        : qContent;

    if (editingQuestionId) {
      const result = await updateQuestionInBank(editingQuestionId, {
        content: finalContent,
        type: qType,
        points: qPoints,
        referenceAnswer: qReferenceAnswer,
        options: qOptions
      });
      if (result.success) {
        toast("Questão atualizada!");
        resetQuestionForm();
        loadGroup(viewingGroupId!);
      }
    } else {
      const result = await createQuestionInBank(viewingGroupId!, {
        content: finalContent,
        type: qType,
        points: qPoints,
        referenceAnswer: qReferenceAnswer,
        options: qOptions
      });
      if (result.success) {
        toast("Questão criada!");
        resetQuestionForm();
        loadGroup(viewingGroupId!);
      }
    }
    setIsSavingQuestion(false);
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }} />
        <div className="fixed top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        
        <Sidebar role="PROFESSOR" />
        <TopBar userName={userName} roleLabel="Professor" />

        <main className="pl-64 pt-16 min-h-screen relative z-10">
            <div className="p-12 max-w-[1200px] mx-auto space-y-10">
                {/* Header Dinâmico */}
                <header className="flex justify-between items-end mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-primary mb-2">
                             <button onClick={exitGroup} className={`flex items-center gap-2 text-sm font-bold opacity-70 hover:opacity-100 transition-all ${!viewingGroupId && 'hidden'}`}>
                                <span className="material-symbols-outlined text-base">arrow_back</span> Voltar aos Grupos
                             </button>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight text-on-surface">
                            {viewingGroupId ? (
                                <>Grupo: <span className="text-primary">{activeGroup?.name}</span></>
                            ) : (
                                <>Banco de <span className="text-primary">Questões</span></>
                            )}
                        </h2>
                        <p className="text-gray-400 max-w-xl">
                            {viewingGroupId 
                                ? "Gerencie as questões deste grupo ou crie novos itens para sua base." 
                                : "Organize seu acervo de questões por grupos temáticos para criar provas em segundos."}
                        </p>
                    </div>

                    {!viewingGroupId && (
                        <button 
                            onClick={handleCreateGroup}
                            className="bg-primary text-black font-black px-8 py-4 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined">add_circle</span> NOVO GRUPO
                        </button>
                    )}
                </header>

                {!viewingGroupId ? (
                    /* Visão de Listagem de Grupos */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-64 rounded-[3rem] bg-white/5 animate-pulse" />
                            ))
                        ) : groups.length === 0 ? (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center grayscale opacity-40 italic">
                                <span className="material-symbols-outlined text-8xl mb-4">folder_off</span>
                                <p>Sua biblioteca está vazia no momento.</p>
                            </div>
                        ) : (
                            groups.map((group, idx) => (
                                <div 
                                    key={group.id} 
                                    className="liquid-glass p-10 rounded-[3rem] border border-outline-variant hover:border-primary/40 transition-all group relative animate-in zoom-in-95 duration-500"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="space-y-6">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">folder_zip</span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-on-surface mb-1">{group.name}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                                {group.questions?.length || 0} questões cadastradas
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => enterGroup(group.id)}
                                                className="flex-1 bg-white/5 hover:bg-primary hover:text-black font-bold p-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                                            >
                                                ABRIR GRUPO
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* Visão Detalhada de Questões de um Grupo */
                    <section className="space-y-10 animate-in fade-in duration-500">
                        {/* Formulário de Nova Questão / Edição */}
                        {!showNewQuestionForm ? (
                            <button 
                                onClick={() => setShowNewQuestionForm(true)}
                                className="w-full py-10 rounded-[3.5rem] border-2 border-dashed border-outline-variant hover:border-primary/50 flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-primary transition-all group"
                            >
                                <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">add_circle</span>
                                <span className="font-bold tracking-widest text-sm">CRIAR NOVA QUESTÃO NESTE GRUPO</span>
                            </button>
                        ) : (
                            <div className="liquid-glass p-12 rounded-[4rem] border border-primary/30 shadow-2xl shadow-primary/5 space-y-10 animate-in slide-in-from-bottom-5 duration-700">
                                <header className="flex justify-between items-center border-b border-white/5 pb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-primary text-black flex items-center justify-center font-black text-xl">
                                            {editingQuestionId ? '?' : '+'}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold">{editingQuestionId ? 'Editando Questão' : 'Nova Questão'}</h3>
                                            <p className="text-sm text-gray-500">Configure o conteúdo, tipo e pontuação abaixo.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">star</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Valor:</span>
                                            <input 
                                                type="number" step="0.1" 
                                                className="w-16 bg-white/5 border border-outline-variant rounded-xl p-2.5 text-center font-bold text-primary outline-none focus:border-primary transition-all"
                                                value={qPoints} onChange={e => setQPoints(parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {typeOptions.map(opt => (
                                                <button 
                                                    key={opt.value}
                                                    onClick={() => setQType(opt.value)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${qType === opt.value ? 'bg-primary text-black border-primary' : 'bg-white/5 border-outline-variant text-gray-500 hover:text-primary'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </header>

                                <div className="space-y-8">
                                    {qType === 'CUSTOM_HTML' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <div className="flex items-center gap-3 text-primary/70">
                                                <span className="material-symbols-outlined text-sm">subject</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Enunciado Opcional (Acima do Código)</span>
                                            </div>
                                            <RichTextEditor 
                                                value={qContent}
                                                onChange={(val) => setQContent(val)}
                                                placeholder="Instruções para o aluno encontrar a resposta no componente interativo..."
                                                isMath={false}
                                            />
                                        </div>
                                    )}

                                    {qType === 'CUSTOM_HTML' ? (
                                        <div className="space-y-6">
                                            <div className="relative group/code">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur opacity-25 group-hover/code:opacity-50 transition duration-1000"></div>
                                                <textarea 
                                                    value={qInteractiveCode}
                                                    onChange={(e) => setQInteractiveCode(e.target.value)}
                                                    placeholder="<!DOCTYPE html>... Seu código aqui."
                                                    className="relative w-full bg-[#0d0e0f]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-sm font-mono text-cyan-400 outline-none focus:border-primary/50 transition-all min-h-[400px] resize-y shadow-2xl custom-scrollbar"
                                                    spellCheck={false}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-6 p-8 rounded-[3rem] bg-cyan-500/5 border border-cyan-500/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500/70">Ambiente de Teste em Tempo Real</span>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            setPreviewContent(qInteractiveCode);
                                                            setCapturedTestAnswer(null);
                                                        }}
                                                        className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-black font-bold rounded-xl hover:brightness-110 transition-all text-xs"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">play_circle</span>
                                                        RENDERIZAR COMPONENTE
                                                    </button>
                                                </div>

                                                {previewContent && (
                                                    <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                                        <div className="relative h-[650px] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                                            <iframe 
                                                                title="preview-editor"
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
                                                                                window.parent.postMessage({ type: 'profacher_answer', answer: val }, '*');
                                                                            };
                                                                        </script>
                                                                        ${previewContent}
                                                                    </body>
                                                                    </html>
                                                                `}
                                                            />
                                                        </div>
                                                        
                                                        <div className={`p-6 rounded-2xl border transition-all flex items-center justify-between ${capturedTestAnswer !== null ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/5 border-white/10'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <span className="material-symbols-outlined text-cyan-400">sensors</span>
                                                                <span className="text-xs font-bold uppercase tracking-tight text-gray-400">Resposta Capturada:</span>
                                                            </div>
                                                            <div className="text-xl font-mono font-black text-cyan-400">
                                                                {capturedTestAnswer !== null ? String(capturedTestAnswer) : "Aguardando interação..."}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <RichTextEditor 
                                            value={qContent}
                                            onChange={(val) => setQContent(val)}
                                            placeholder="Enunciado da nova questão para seu acervo..."
                                            isMath={qType === 'MATH'}
                                        />
                                    )}

                                    { (qType === 'ESSAY' || qType === 'MATH' || qType === 'CUSTOM_HTML') && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 bg-amber-500/5 p-8 rounded-[2rem] border border-white/5">
                                            <div className="flex items-center gap-3 text-amber-500">
                                                <span className="material-symbols-outlined">auto_fix_high</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Gabarito de Referência (IA)</span>
                                            </div>
                                            <textarea 
                                                placeholder={qType === 'CUSTOM_HTML' ? "Qual é o valor esperado da interação? Ex: 2021 | 50. A IA usará isso para avaliar a resposta capturada." : "Digite aqui a resposta que você espera do aluno..."}
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-sm text-amber-100 outline-none focus:border-amber-500/50 transition-all h-32 resize-none shadow-inner placeholder:text-amber-500/30"
                                                value={qReferenceAnswer}
                                                onChange={e => setQReferenceAnswer(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {qType !== 'ESSAY' && qType !== 'MATH' && qType !== 'CUSTOM_HTML' && (
                                        <div className="space-y-6 pt-4 animate-in fade-in duration-500">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                                    {qType === 'TRUE_FALSE' ? 'Defina as afirmações e seus gabaritos (V/F)' : 'Defina as alternativas (marque a correta)'}
                                                </p>
                                                <button 
                                                    onClick={addOption}
                                                    className="text-xs font-bold text-primary flex items-center gap-2 hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                                    {qType === 'TRUE_FALSE' ? 'Adicionar Afirmação' : 'Adicionar Alternativa'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-6">
                                                {qOptions.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-4 group/opt">
                                                        {qType === 'TRUE_FALSE' ? (
                                                            <div className="flex gap-2 shrink-0">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newOpts = [...qOptions];
                                                                        newOpts[oIndex].isCorrect = true;
                                                                        setQOptions(newOpts);
                                                                    }}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all font-bold ${opt.isCorrect ? 'bg-green-500 text-black border-green-500 scale-110 shadow-lg shadow-green-500/20' : 'border-outline-variant text-gray-600 hover:border-green-500/50'}`}
                                                                >
                                                                    V
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newOpts = [...qOptions];
                                                                        newOpts[oIndex].isCorrect = false;
                                                                        setQOptions(newOpts);
                                                                    }}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all font-bold ${!opt.isCorrect ? 'bg-red-500 text-black border-red-500 scale-110 shadow-lg shadow-red-500/20' : 'border-outline-variant text-gray-600 hover:border-red-500/50'}`}
                                                                >
                                                                    F
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setQOptions(qOptions.map((o, idx) => ({ ...o, isCorrect: idx === oIndex })))}
                                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all font-bold shrink-0 ${opt.isCorrect ? 'bg-primary text-black border-primary scale-110 shadow-lg' : 'border-outline-variant text-gray-600'}`}
                                                            >
                                                                {opt.isCorrect ? <span className="material-symbols-outlined text-sm">done</span> : String.fromCharCode(65 + oIndex)}
                                                            </button>
                                                        )}
                                                        
                                                        <input 
                                                            className={`flex-1 bg-white/5 border rounded-2xl p-5 outline-none transition-all ${opt.isCorrect ? 'border-primary/40 text-on-surface font-bold' : 'border-outline-variant focus:border-primary text-gray-400'}`}
                                                            value={opt.content}
                                                            onChange={e => {
                                                                const newOpts = [...qOptions];
                                                                newOpts[oIndex].content = e.target.value;
                                                                setQOptions(newOpts);
                                                            }}
                                                            placeholder={qType === 'TRUE_FALSE' ? "Digite a afirmação..." : `Texto da alternativa ${String.fromCharCode(65 + oIndex)}...`}
                                                        />
                                                        
                                                        {qOptions.length > 2 && (
                                                            <button 
                                                                onClick={() => removeOption(oIndex)}
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

                                    <div className="flex justify-end gap-4 pt-6">
                                        <button 
                                            disabled={isSavingQuestion}
                                            onClick={resetQuestionForm}
                                            className="text-gray-500 font-bold px-8 py-4 rounded-2xl hover:bg-white/5 transition-all"
                                        >
                                            DESCARTAR
                                        </button>
                                        <button 
                                            disabled={isSavingQuestion}
                                            onClick={handleSaveQuestion}
                                            className={`${editingQuestionId ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'} text-black font-bold px-12 py-4 rounded-2xl flex items-center gap-2 hover:brightness-110 transition-all shadow-lg disabled:opacity-50`}
                                        >
                                            {isSavingQuestion ? <span className="animate-spin material-symbols-outlined">sync</span> : <span className="material-symbols-outlined">{editingQuestionId ? 'save' : 'verified'}</span>}
                                            {editingQuestionId ? 'ATUALIZAR QUESTÃO' : 'GUARDAR NO ACERVO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lista de Questões do Grupo */}
                        {isContentLoading ? (
                            <div className="flex flex-col items-center py-20 animate-pulse">
                                <span className="animate-spin material-symbols-outlined text-5xl text-primary">sync</span>
                            </div>
                        ) : activeGroup?.questions?.length ? (
                            activeGroup.questions.map((q, idx) => (
                                <div key={q.id} className="liquid-glass p-10 rounded-[3rem] border border-outline-variant relative group/item animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-primary border border-white/5">
                                            {idx + 1}
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{typeOptions.find(t => t.value === q.type)?.label || q.type}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest bg-white/5 text-gray-500 px-3 py-1 rounded-full">{q.points} PTS</span>
                                        </div>
                                        
                                        <div className="absolute top-8 right-8 flex items-center gap-2">
                                          <button 
                                              onClick={() => handleEditQuestion(q)}
                                              className="w-10 h-10 rounded-xl bg-white/5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all flex items-center justify-center opacity-0 group-hover/item:opacity-100"
                                              title="Editar Questão"
                                          >
                                              <span className="material-symbols-outlined text-lg">edit</span>
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteQuestion(q.id)}
                                              className="w-10 h-10 rounded-xl bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center opacity-0 group-hover/item:opacity-100"
                                              title="Excluir Questão"
                                          >
                                              <span className="material-symbols-outlined text-lg">delete</span>
                                          </button>
                                        </div>
                                    </div>

                                    {/* Exibição resumida do conteúdo */}
                                    <div className="space-y-4">
                                        <div 
                                            className="text-gray-300 line-clamp-3 prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ 
                                                // Exibe apenas a parte do enunciado se for CUSTOM_HTML
                                                __html: q.type === 'CUSTOM_HTML' ? q.content.split(CODE_SEPARATOR)[0] : q.content 
                                            }}
                                        />
                                        
                                        {q.type === 'CUSTOM_HTML' && (
                                            <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center gap-3">
                                                <span className="material-symbols-outlined text-cyan-500 text-sm">code</span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-500">Componente Interativo Integrado</span>
                                            </div>
                                        )}

                                        {q.options && q.options.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`px-4 py-1.5 rounded-xl border text-[10px] font-bold ${opt.isCorrect ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-gray-500'}`}>
                                                        {q.type === 'TRUE_FALSE' ? (opt.isCorrect ? 'V' : 'F') : String.fromCharCode(65 + oIdx)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center py-20 grayscale opacity-40 italic">
                                <span className="material-symbols-outlined text-6xl mb-4">edit_note</span>
                                <p>Este grupo ainda não possui questões.</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    </div>
  );
}
