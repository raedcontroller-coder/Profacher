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
    deleteQuestionInBank
} from './actions';
import RichTextEditor from '@/components/shared/RichTextEditor';

interface Question {
  id: number;
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH";
  points: number;
  referenceAnswer?: string;
  options: Array<{ id?: number; content: string; isCorrect: boolean }>;
}

interface QuestionGroup {
  id: number;
  name: string;
  description: string | null;
  _count?: { questions: number };
  questions?: Question[];
}

const typeOptions = [
  { value: 'MULTIPLE_CHOICE', label: 'Objetiva', icon: 'list_alt' },
  { value: 'TRUE_FALSE', label: 'V / F', icon: 'check_circle' },
  { value: 'ESSAY', label: 'Dissertativa', icon: 'notes' },
  { value: 'MATH', label: 'Cálculo', icon: 'functions' },
] as const;

export default function QuestionsClient({ userName }: { userName: string }) {
  // Estados da Lista Geral
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Estados da Visão de Detalhes (Dentro do Grupo)
  const [viewingGroupId, setViewingGroupId] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<QuestionGroup | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  
  // Estados da Nova Questão
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH">('MULTIPLE_CHOICE');
  const [qPoints, setQPoints] = useState(1.0);
  const [qReferenceAnswer, setQReferenceAnswer] = useState('');
  const [qOptions, setQOptions] = useState<Array<{ content: string; isCorrect: boolean }>>([
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false }
  ]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  async function loadGroups() {
    setLoading(true);
    try {
      const data = await getQuestionGroups();
      setGroups(data);
    } catch (e) {
      console.error("Erro ao carregar grupos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  // --- Handlers de Grupo ---
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingGroup(true);
    const res = await createQuestionGroup({ name: newName, description: newDesc });
    if (res.success) {
      await loadGroups();
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
    }
    setIsCreatingGroup(false);
  }

  async function handleDeleteGroup(id: number) {
    if (confirm("Deseja realmente excluir este grupo? As questões associadas permanecerão no banco, mas perderão a categoria.")) {
      const res = await deleteQuestionGroup(id);
      if (res.success) {
        await loadGroups();
      }
    }
  }

  async function enterGroup(id: number) {
    setViewingGroupId(id);
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

  function exitGroup() {
    setViewingGroupId(null);
    setActiveGroup(null);
    setShowNewQuestionForm(false);
    loadGroups(); // Atualiza contadores na volta
  }

  // --- Handlers de Questão ---
  function handleTypeChange(newType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY" | "MATH") {
    setQType(newType);
    if (newType === 'TRUE_FALSE') {
      setQOptions([
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: true }
      ]);
    } else if (newType === 'MULTIPLE_CHOICE') {
      setQOptions([
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false }
      ]);
    } else {
      setQOptions([]);
    }
  }

  function addOption() {
    setQOptions([...qOptions, { content: '', isCorrect: false }]);
  }

  function removeOption(oIndex: number) {
    setQOptions(qOptions.filter((_, i) => i !== oIndex));
  }

  async function handleSaveQuestion() {
    if (!qContent.trim()) {
        alert("Digite o enunciado da questão.");
        return;
    }
    if ((qType === 'ESSAY' || qType === 'MATH') && !qReferenceAnswer.trim()) {
        alert("Gabarito de referência é obrigatório no banco.");
        return;
    }

    setIsSavingQuestion(true);
    try {
        const res = await createQuestionInBank({
            groupId: viewingGroupId!,
            content: qContent,
            type: qType,
            points: qPoints,
            referenceAnswer: qReferenceAnswer,
            options: qOptions
        });

        if (res.success) {
            setQContent('');
            setQReferenceAnswer('');
            setShowNewQuestionForm(false);
            const updated = await getGroupWithQuestions(viewingGroupId!);
            setActiveGroup(updated as any);
        } else {
            alert("Erro ao salvar: " + res.error);
        }
    } catch (e) {
        alert("Erro inesperado.");
    } finally {
        setIsSavingQuestion(false);
    }
  }

  async function handleDeleteQuestion(id: number) {
    if (confirm("Excluir esta questão permanentemente do banco?")) {
        const res = await deleteQuestionInBank(id);
        if (res.success) {
            const updated = await getGroupWithQuestions(viewingGroupId!);
            setActiveGroup(updated as any);
        }
    }
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center" 
        style={{ backgroundImage: "url('/bg.png')" }} 
      />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1700px] mx-auto space-y-12">
          
          {!viewingGroupId ? (
            /* --- VIEW 1: LISTA GERAL DE GRUPOS --- */
            <>
                <header className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-bold tracking-tight text-on-surface">Banco de <span className="text-primary">Questões</span></h2>
                        <p className="text-gray-400 text-xl max-w-2xl leading-relaxed">
                            Organize o seu acervo por temas e importe tudo pronto para suas avaliações.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary text-black font-bold px-10 py-5 rounded-[2rem] flex items-center gap-3 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 group"
                    >
                        <span className="material-symbols-outlined font-bold group-hover:rotate-90 transition-transform">add_box</span>
                        CRIAR NOVO GRUPO
                    </button>
                </header>

                <section className={loading ? "flex justify-center py-32" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in zoom-in-95 duration-1000"}>
                    {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <span className="animate-spin material-symbols-outlined text-5xl text-primary">sync</span>
                        <p className="text-xs font-mono uppercase tracking-widest text-primary animate-pulse">Sincronizando acervo...</p>
                    </div>
                    ) : groups.length > 0 ? (
                        groups.map((group, idx) => (
                        <div 
                            key={idx} 
                            className="liquid-glass p-8 rounded-[3rem] border border-outline-variant hover:border-primary/50 transition-all group relative overflow-hidden flex flex-col h-full cursor-pointer"
                            style={{ animationDelay: `${idx * 100}ms` }}
                            onClick={() => enterGroup(group.id)}
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="p-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <span className="material-symbols-outlined text-xl">delete</span>
                                </button>
                            </div>
                            
                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8 border border-primary/20 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl">inventory_2</span>
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                <h3 className="text-2xl font-bold text-on-surface truncate group-hover:text-primary transition-colors">{group.name}</h3>
                                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed min-h-[60px] italic">
                                    {group.description || 'Acervo temático sem descrição.'}
                                </p>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-outline-variant flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Itens</span>
                                    <span className="text-lg font-bold text-primary">{group._count?.questions || 0} <span className="text-xs text-gray-500">questões</span></span>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl hover:bg-primary transition-all hover:text-black group/btn">
                                    <span className="material-symbols-outlined text-xl group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                </div>
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className="col-span-full py-40 liquid-glass rounded-[4rem] flex flex-col items-center justify-center text-center gap-6 border border-dashed border-outline-variant opacity-60">
                            <span className="material-symbols-outlined text-6xl text-primary/30">folder_open</span>
                            <div className="space-y-2">
                                <h4 className="text-2xl font-bold tracking-tight">O Banco está limpo</h4>
                                <p className="text-gray-500 max-w-xs mx-auto">Comece criando um grupo para organizar seus questionários.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(true)} className="text-primary font-bold uppercase tracking-widest text-xs hover:underline underline-offset-8">Criar primeiro grupo</button>
                        </div>
                    )}
                </section>
            </>
          ) : (
            /* --- VIEW 2: DENTRO DO GRUPO (QUESTÕES) --- */
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="flex flex-col gap-6">
                    <button 
                        onClick={exitGroup}
                        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-bold text-sm tracking-widest uppercase mb-4"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span> Voltar ao Acervo
                    </button>
                    
                    <div className="flex justify-between items-end">
                        <div className="space-y-2">
                            <h2 className="text-5xl font-bold text-on-surface">{activeGroup?.name}</h2>
                            <p className="text-gray-500 text-lg italic">{activeGroup?.description || 'Repositório de questões específicas para este tema.'}</p>
                        </div>
                        <button 
                            onClick={() => setShowNewQuestionForm(!showNewQuestionForm)}
                            className={`px-8 py-4 rounded-[2rem] font-bold flex items-center gap-3 transition-all transform active:scale-95 shadow-xl ${showNewQuestionForm ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-primary text-black hover:brightness-110 shadow-primary/20'}`}
                        >
                            <span className="material-symbols-outlined">{showNewQuestionForm ? 'close' : 'add_circle'}</span>
                            {showNewQuestionForm ? 'CANCELAR CADASTRO' : 'NOVA QUESTÃO'}
                        </button>
                    </div>
                </header>

                <div className="space-y-8">
                    {/* Form de Nova Questão Inline */}
                    {showNewQuestionForm && (
                        <div className="liquid-glass p-12 rounded-[4rem] border-2 border-primary/30 animate-in zoom-in-95 duration-500 space-y-10">
                             <div className="flex items-center gap-8 border-b border-white/5 pb-8">
                                <div className="w-14 h-14 rounded-2xl bg-primary text-black flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/20">
                                    +
                                </div>
                                <div className="flex items-center gap-8 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-500 text-lg">star</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Pontos:</span>
                                        <input 
                                            type="number" step="0.1" 
                                            className="w-16 bg-white/5 border border-outline-variant rounded-xl p-2.5 text-center font-bold text-primary outline-none focus:border-primary"
                                            value={qPoints} onChange={e => setQPoints(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {typeOptions.map(opt => (
                                                <button 
                                                    key={opt.value}
                                                    onClick={() => handleTypeChange(opt.value)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${qType === opt.value ? 'bg-primary text-black border-primary' : 'bg-white/5 border-outline-variant text-gray-500 hover:border-primary/40'}`}
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
                                <RichTextEditor 
                                    value={qContent}
                                    onChange={(val) => setQContent(val)}
                                    placeholder="Enunciado da nova questão para seu acervo..."
                                />

                                {(qType === 'ESSAY' || qType === 'MATH') && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 bg-amber-500/5 p-8 rounded-[2rem] border border-amber-500/10">
                                        <div className="flex items-center gap-3 text-amber-500">
                                            <span className="material-symbols-outlined">auto_fix_high</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Gabarito de Referência (Obrigatório)</span>
                                        </div>
                                        <textarea 
                                            placeholder="A IA usará este texto como única base de comparação para correção futura..."
                                            className="w-full bg-white/5 border border-amber-500/20 rounded-2xl p-6 text-sm text-amber-100 outline-none focus:border-amber-500/50 h-32 resize-none shadow-inner placeholder:text-amber-500/30"
                                            value={qReferenceAnswer} onChange={e => setQReferenceAnswer(e.target.value)}
                                        />
                                    </div>
                                )}

                                {qType !== 'ESSAY' && qType !== 'MATH' && (
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
                                        onClick={handleSaveQuestion}
                                        className="bg-primary text-black font-bold px-12 py-4 rounded-2xl flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >
                                        {isSavingQuestion ? <span className="animate-spin material-symbols-outlined">sync</span> : <span className="material-symbols-outlined">verified</span>}
                                        GUARDAR NO ACERVO
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
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-primary border border-primary/20">
                                        {idx + 1}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{q.type}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest bg-white/5 text-gray-500 px-3 py-1 rounded-full">{q.points} PTS</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="absolute top-8 right-8 text-gray-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                                <div 
                                    className="text-xl text-on-surface leading-normal mb-8 prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: q.content }}
                                />
                                
                                {q.referenceAnswer && (
                                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-200/60 text-sm italic mb-6">
                                        Gabarito de Referência: {q.referenceAnswer}
                                    </div>
                                )}

                                {q.options?.length > 0 && (
                                    <div className="grid grid-cols-1 gap-4">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${q.type === 'TRUE_FALSE' ? (opt.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : (opt.isCorrect ? 'border-primary/30 bg-primary/5' : 'border-white/5')}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-gray-500">
                                                        {q.type === 'TRUE_FALSE' ? (opt.isCorrect ? 'V' : 'F') : String.fromCharCode(65 + oIdx) + ')'}
                                                    </span>
                                                    <span className="text-sm">{opt.content}</span>
                                                </div>
                                                {opt.isCorrect && q.type !== 'TRUE_FALSE' && <span className="material-symbols-outlined text-[14px] text-primary">done</span>}
                                                {q.type === 'TRUE_FALSE' && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${opt.isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-black'}`}>
                                                        {opt.isCorrect ? 'VERDADEIRO' : 'FALSO'}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : !showNewQuestionForm && (
                        <div className="py-32 flex flex-col items-center opacity-30 grayscale">
                            <span className="material-symbols-outlined text-[100px]">edit_document</span>
                            <p className="text-2xl font-bold mt-4">Este grupo não tem questões</p>
                            <p>O acervo desta categoria está vazio.</p>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* Modal de Criação de Grupo */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
               <div className="liquid-glass w-full max-w-xl p-12 rounded-[3.5rem] border border-outline-variant relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  
                  <div className="flex justify-between items-start mb-10">
                     <div>
                        <h3 className="text-3xl font-bold tracking-tight">Novo Grupo</h3>
                        <p className="text-gray-500 mt-2">Crie uma categoria para organizar suas questões.</p>
                     </div>
                     <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                        <span className="material-symbols-outlined">close</span>
                     </button>
                  </div>

                  <form onSubmit={handleCreateGroup} className="space-y-8">
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary ml-1">Título do Grupo</label>
                        <input 
                          required 
                          disabled={isCreatingGroup}
                          value={newName} 
                          onChange={e => setNewName(e.target.value)}
                          placeholder="Ex: Física - Leis de Newton"
                          className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary ml-1">Observações (Opcional)</label>
                        <textarea 
                          disabled={isCreatingGroup}
                          value={newDesc} 
                          onChange={e => setNewDesc(e.target.value)}
                          placeholder="Descreva o que este grupo abrange..."
                          className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface h-32 resize-none"
                        />
                     </div>
                     
                     <div className="flex gap-4 pt-4">
                        <button 
                          type="button" 
                          disabled={isCreatingGroup}
                          onClick={() => setIsModalOpen(false)} 
                          className="flex-1 p-5 rounded-2xl font-bold hover:bg-white/5 border border-transparent hover:border-outline-variant transition-all"
                        >
                           Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={isCreatingGroup}
                          className="flex-[2] bg-primary text-black font-bold p-5 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                           {isCreatingGroup ? (
                              <span className="animate-spin material-symbols-outlined">sync</span>
                           ) : (
                              <>
                                 <span className="material-symbols-outlined">save</span>
                                 Confirmar e Salvar
                              </>
                           )}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
