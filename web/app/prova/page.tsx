'use client'

import React, { useState, useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { getLiveExamQuestions, saveLiveAnswer, finishExamLive, getQuickExamStatus } from '@/app/professor/exams/actions';
import MathRenderer from '@/components/shared/MathRenderer';

export default function UnifiedStudentExamPage() {
  const [step, setStep] = useState<'ID' | 'WAITING' | 'STARTED' | 'LIVE' | 'FINISHED' | 'EXPULLED'>('ID');
  const [formData, setFormData] = useState({
    name: '',
    ra: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [savingStatus, setSavingStatus] = useState<Record<number, 'saving' | 'saved' | 'error'>>({});

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ra || formData.code.length < 5) return;
    
    setLoading(true);
    
    // NOVO: Verificação de resiliência ao entrar
    try {
      const normalizedName = formData.name.toUpperCase();
      const statusCheck = await getQuickExamStatus(formData.code);
      if (statusCheck.success) {
        if (statusCheck.status === 'STARTED') {
          // Prova já está rolando! Pula WAITING.
          setStep('STARTED');
        } else if (statusCheck.status === 'WAITING') {
          setStep('WAITING');
        } else {
          alert("Esta prova não está disponível ou o código está incorreto.");
        }
      } else {
        alert("Erro ao acessar a sala. Verifique sua conexão.");
      }
    } catch (err) {
      console.error("Erro no handleJoin:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lógica de tempo real (Socket)
  useEffect(() => {
    if (step !== 'ID' && step !== 'FINISHED' && step !== 'EXPULLED' && formData.code) {
      const normalizedName = formData.name.toUpperCase();
      const authUrl = `/api/pusher/auth?student_name=${encodeURIComponent(normalizedName)}&student_ra=${encodeURIComponent(formData.ra)}`;
      const pusher = getPusherClient(authUrl);
      const channelName = `presence-exam-${formData.code.toUpperCase()}`;
      const channel = pusher.subscribe(channelName);

      channel.bind('exam:started', () => {
        setStep('STARTED');
      });

      channel.bind('exam:finished', () => {
        setStep('ID');
        setExamData(null);
      });

      // NOVO: Ouvinte de Expulsão
      channel.bind('student:kicked', (data: { ra: string }) => {
        if (data.ra === formData.ra) {
          console.warn("[PLAYER] Acesso revogado pela moderação.");
          setStep('EXPULLED');
          setExamData(null);
        }
      });

      return () => {
         console.log("[PLAYER] Desconectando Socket do Aluno...");
         channel.unbind_all();
         pusher.unsubscribe(channelName);
         pusher.disconnect();
      };
    }
  }, [step, formData]);

  // Transição automática de STARTED para LIVE
  useEffect(() => {
    if (step === 'STARTED') {
      const timer = setTimeout(async () => {
        const result = await getLiveExamQuestions(formData.code, formData.name, formData.ra);
        console.log("[PLAYER] Questões carregadas:", result);
        if (result.success) {
          setExamData(result.exam);
          setSubmissionId(result.submissionId);
          
          // NOVO: Restaurar respostas anteriores se existirem (Reconexão)
          if (result.previousAnswers) {
            setAnswers(result.previousAnswers);
            console.log("[PLAYER] Respostas restauradas:", result.previousAnswers);
          }
          
          setStep('LIVE');
          console.log("[PLAYER] SubmissionID pronto:", result.submissionId);
        } else {
          // Se o erro for de expulsão, manda para a tela de bloqueio
          if (result.error?.includes("revogado")) {
            setStep('EXPULLED');
          } else {
            alert(result.error || "Erro ao carregar questões.");
            setStep('ID');
          }
        }
      }, 1500); // Reduzido para 1.5s para ser mais ágil na reconexão
      return () => clearTimeout(timer);
    }
  }, [step, formData]);

  // RENDERIZAÇÃO: EXPULSO
  if (step === 'EXPULLED') {
    return (
      <div className="bg-[#121315] min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <span className="material-symbols-outlined text-5xl">block</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white">ACESSO REVOGADO</h1>
            <p className="text-gray-400 leading-relaxed">
              O seu acesso a esta sala de prova foi interrompido por decisão da moderação do professor.
            </p>
          </div>
          <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
             <p className="text-xs text-red-400 font-mono italic">
               ID da Sessão: {formData.ra} (BLOQUEADO)
             </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all font-bold"
          >
            VOLTAR AO INÍCIO
          </button>
        </div>
      </div>
    );
  }

  const handleSelectOption = async (questionId: number, optionIdOrValue: any) => {
    if (!submissionId) return;

    let finalAnswer: any;

    // Lógica para Verdadeiro ou Falso (múltiplas afirmações)
    if (typeof optionIdOrValue === 'string' && (optionIdOrValue.endsWith('_V') || optionIdOrValue.endsWith('_F'))) {
      const [optIdStr, val] = optionIdOrValue.split('_');
      const optId = parseInt(optIdStr);
      const currentQAnswer = answers[questionId] || {};
      finalAnswer = { ...currentQAnswer, [optId]: val };
    } else {
      // Lógica para Múltipla Escolha (uma única opção)
      finalAnswer = optionIdOrValue;
    }

    // Atualizar UI localmente
    setAnswers(prev => ({ ...prev, [questionId]: finalAnswer }));
    setSavingStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    // Salvar no banco
    const result = await saveLiveAnswer(submissionId, questionId, finalAnswer);
    if (result.success) {
      setSavingStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      setTimeout(() => {
        setSavingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
    } else {
      setSavingStatus(prev => ({ ...prev, [questionId]: 'error' }));
    }
  };

  const handleFinish = async () => {
    if (!submissionId) {
      console.error("[PLAYER] Erro: Tentativa de finalizar sem submissionId!");
      return;
    }
    if (!confirm("Tem certeza que deseja finalizar e entregar sua prova agora?")) return;

    setLoading(true);
    console.log("[PLAYER] Solicitando entrega da submissão:", submissionId);
    
    try {
      const result = await finishExamLive(submissionId);
      console.log("[PLAYER] Resposta do servidor:", result);

      if (result.success) {
        setStep('FINISHED');
      } else {
        alert("Erro ao finalizar: " + result.error);
      }
    } catch (err) {
      console.error("[PLAYER] Erro técnico ao finalizar:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 transition-all duration-700">
        
        {/* PASSO 1: IDENTIFICAÇÃO */}
        {(step === 'ID' || step === 'WAITING' || step === 'STARTED') && (
          <div className="liquid-glass p-10 rounded-[3rem] border border-outline-variant shadow-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black text-on-surface tracking-tight">
                Profacher <span className="text-primary">2.0</span>
              </h1>
              <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] opacity-60">Portal de Avaliação Digital</p>
            </div>

            {step === 'ID' && (
              <form onSubmit={handleJoin} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-widest">Seu Nome Completo</label>
                    <input 
                      type="text" required placeholder="Ex: JOÃO SILVA DE ALMEIDA"
                      className="w-full bg-white/5 border border-white/5 rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg font-medium uppercase"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-widest">RA (Matrícula)</label>
                      <input 
                        type="text" required placeholder="Ex: 123456"
                        className="w-full bg-white/5 border border-white/5 rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-secondary/50 transition-all text-lg font-mono"
                        value={formData.ra} onChange={(e) => setFormData({...formData, ra: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary ml-4 uppercase tracking-widest">Código da Prova</label>
                      <input 
                        type="text" required maxLength={5} placeholder="ABCDE"
                        className="w-full bg-primary/5 border border-primary/10 rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-primary transition-all text-lg font-black font-mono uppercase text-primary text-center tracking-[0.2em]"
                        value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading || formData.code.length < 5} className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl ${formData.code.length === 5 && !loading ? 'bg-primary text-black hover:scale-[1.03] shadow-primary/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>
                  {loading ? <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" /> : <>Acessar Sala de Prova <span className="material-symbols-outlined font-bold">login</span></>}
                </button>
              </form>
            )}

            {step === 'WAITING' && (
              <div className="text-center space-y-10 animate-in zoom-in-95 duration-700">
                <div className="relative inline-block">
                  <div className="w-32 h-32 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-5xl animate-pulse">hourglass_top</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-black italic">Tudo certo, {formData.name.split(' ')[0]}!</h2>
                  <p className="text-gray-400 font-medium">O professor dará o sinal para iniciar a prova em instantes. Mantenha esta aba aberta.</p>
                </div>
                <div className="pt-10 space-y-6">
                  <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">Código da Prova</p>
                    <span className="inline-block px-10 py-3 bg-primary/10 text-primary rounded-2xl border-2 border-primary/20 font-mono font-black text-3xl shadow-lg shadow-primary/5">{formData.code}</span>
                  </div>
                  <button onClick={() => setStep('ID')} className="w-full py-5 rounded-2xl border-2 border-white/5 bg-white/[0.02] text-gray-400 font-bold flex items-center justify-center gap-3 hover:bg-white/5 hover:text-white hover:border-white/10 transition-all active:scale-95 group">
                    <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Sair da sala
                  </button>
                </div>
              </div>
            )}

            {step === 'STARTED' && (
              <div className="text-center space-y-8 animate-in fade-in scale-110 duration-700">
                <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 rotate-12">
                  <span className="material-symbols-outlined text-black text-6xl font-bold-rotate-12 animate-bounce">rocket_launch</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black">TUDO PRONTO!</h2>
                  <p className="text-gray-400 font-medium text-lg">Iniciando sua avaliação. Boa sorte!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASSO 2: PROVA LIVE (MODAL RISING) */}
        {step === 'LIVE' && examData && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#121315] animate-modal-rise italic-none">
            <header className="h-24 liquid-glass border-b border-white/5 flex items-center justify-between px-10 shrink-0 animate-fade-in">
               <div>
                  <h2 className="text-xl font-black text-primary uppercase tracking-tighter">{examData.title}</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{formData.name} &bull; RA: {formData.ra}</p>
               </div>
               <button onClick={handleFinish} className="bg-red-500/10 text-red-500 border border-red-500/20 px-8 py-3 rounded-full font-black text-xs hover:bg-red-500 hover:text-white transition-all">
                  FINALIZAR PROVA
               </button>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-5xl mx-auto space-y-12 pb-24">
                {examData.questions.map((q: any, index: number) => (
                  <div key={q.id} className="liquid-glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 animate-modal-rise" style={{ animationDelay: `${index * 150}ms` }}>
                    <div className="flex items-start justify-between">
                       <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-white/5">
                          {index + 1}
                       </span>
                       <div className="flex items-center gap-2">
                          {savingStatus[q.id] === 'saving' && <span className="text-[10px] font-bold text-gray-500 uppercase animate-pulse">Sincronizando...</span>}
                          {savingStatus[q.id] === 'saved' && <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> Salvo</span>}
                       </div>
                    </div>

                    <MathRenderer className="text-2xl font-medium leading-relaxed exam-content" content={q.content} />

                    <div className="space-y-6">
                      {/* TIPO: DISSERTATIVA OU CÁLCULO */}
                      {(q.type === 'ESSAY' || q.type === 'MATH') && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          <textarea 
                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-lg text-on-surface outline-none focus:border-primary/40 transition-all min-h-[250px] resize-none placeholder:text-gray-700"
                            placeholder="Escreva sua resposta aqui..."
                            value={answers[q.id] || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setAnswers(prev => ({ ...prev, [q.id]: val }));
                              
                              // Debounce manual para salvar no banco
                              if ((window as any)[`timeout_${q.id}`]) clearTimeout((window as any)[`timeout_${q.id}`]);
                              setSavingStatus(prev => ({ ...prev, [q.id]: 'saving' }));
                              
                              (window as any)[`timeout_${q.id}`] = setTimeout(async () => {
                                const result = await saveLiveAnswer(submissionId!, q.id, val);
                                if (result.success) {
                                  setSavingStatus(prev => ({ ...prev, [q.id]: 'saved' }));
                                  setTimeout(() => setSavingStatus(prev => ({ ...prev, [q.id]: undefined })), 2000);
                                } else {
                                  setSavingStatus(prev => ({ ...prev, [q.id]: 'error' }));
                                }
                              }, 1000); // Salva após 1 segundo de pausa
                            }}
                          />
                        </div>
                      )}

                      {/* TIPO: VERDADEIRO OU FALSO */}
                      {q.type === 'TRUE_FALSE' && (
                        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
                          {q.options.map((opt: any) => (
                            <div key={opt.id} className="flex items-center gap-6 bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all">
                              <div className="flex gap-2 shrink-0">
                                <button 
                                  onClick={() => handleSelectOption(q.id, opt.id + "_V")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all font-black text-lg ${answers[q.id]?.[opt.id] === 'V' ? 'bg-green-500 text-black border-green-500 scale-110 shadow-lg shadow-green-500/20' : 'border-white/10 text-gray-600 hover:border-green-500/50'}`}
                                >
                                  V
                                </button>
                                <button 
                                  onClick={() => handleSelectOption(q.id, opt.id + "_F")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all font-black text-lg ${answers[q.id]?.[opt.id] === 'F' ? 'bg-red-500 text-black border-red-500 scale-110 shadow-lg shadow-red-500/20' : 'border-white/10 text-gray-600 hover:border-red-500/50'}`}
                                >
                                  F
                                </button>
                              </div>
                              <span className="flex-1 text-xl font-medium text-gray-200 leading-tight">{opt.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* TIPO: MÚLTIPLA ESCOLHA (Padrão) */}
                      {q.type === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          {q.options.map((opt: any) => (
                            <button 
                              key={opt.id}
                              onClick={() => handleSelectOption(q.id, opt.id)}
                              className={`w-full p-6 rounded-[1.5rem] border-2 text-left transition-all flex items-center gap-4 group ${
                                answers[q.id] === opt.id 
                                ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' 
                                : 'bg-white/5 border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                answers[q.id] === opt.id ? 'border-primary bg-primary' : 'border-gray-700'
                              }`}>
                                {answers[q.id] === opt.id && <div className="w-2 h-2 bg-black rounded-full" />}
                              </div>
                              <span className="text-lg font-medium">{opt.content}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* PASSO 3: FINALIZADO */}
        {step === 'FINISHED' && (
          <div className="liquid-glass p-12 rounded-[3.5rem] border border-outline-variant shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-700">
            <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-green-500/30">
               <span className="material-symbols-outlined text-green-500 text-6xl">verified</span>
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-black tracking-tight">PROVA ENTREGUE!</h2>
               <p className="text-gray-400 font-medium">Sua avaliação foi enviada com sucesso ao servidor. <br/>Você pode fechar esta aba agora.</p>
            </div>
            <div className="pt-6">
               <p className="text-[10px] text-gray-700 uppercase font-black tracking-widest">Profacher 2.0 &bull; Feedback em Tempo Real</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
