'use client'

import React, { useState, useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { getLiveExamQuestions, saveLiveAnswer, finishExamLive, getQuickExamStatus, reportFocusLoss } from '@/app/professor/exams/actions';
import MathRenderer from '@/components/shared/MathRenderer';
import { generateExamPdf } from '@/lib/utils/pdf-generator';

const CODE_SEPARATOR = '<!-- PROFACHER_CODE_SEPARATOR -->';

export default function UnifiedStudentExamPage() {
  const [step, setStep] = useState<'ID' | 'WAITING' | 'STARTED' | 'INSTRUCTIONS' | 'LIVE' | 'REVIEW' | 'FINISHED' | 'EXPULLED' | 'UNSUPPORTED_BROWSER'>('ID');
  const [formData, setFormData] = useState({
    name: '',
    ra: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [savingStatus, setSavingStatus] = useState<Record<number, 'saving' | 'saved' | 'error' | undefined>>({});
  const [scoreData, setScoreData] = useState<{ score: number, maxScore: number, details: any[], showScore: boolean } | null>(null);
  const pusherRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const saveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
	
  // Detecção de navegador Microsoft Edge
  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const isEdge = /Edg\//.test(userAgent);
    
    if (isEdge) {
      setStep('UNSUPPORTED_BROWSER');
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ra || formData.code.length < 5) return;
    
    setLoading(true);
    
    try {
      const statusCheck = await getQuickExamStatus(formData.code);
      if (statusCheck.success) {
        if (statusCheck.status === 'STARTED') {
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

    // Tentar entrar em Fullscreen (Requer gesto do usuário, que é este clique)
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Navegador bloqueou o fullscreen automático:", err);
    }
  };

  useEffect(() => {
    if (!formData.code || !formData.ra || step === 'ID' || step === 'FINISHED' || step === 'EXPULLED') {
      if (pusherRef.current) {
        channelRef.current?.unbind_all();
        pusherRef.current.unsubscribe(`presence-exam-${formData.code.toUpperCase()}`);
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelRef.current = null;
      }
      return;
    }

    const normalizedName = formData.name.toUpperCase();
    const channelName = `presence-exam-${formData.code.toUpperCase()}`;

    if (pusherRef.current && channelRef.current?.name === channelName) {
      return;
    }
    
    const authUrl = `/api/pusher/auth?student_name=${encodeURIComponent(normalizedName)}&student_ra=${encodeURIComponent(formData.ra)}`;
    
    if (pusherRef.current) {
      pusherRef.current.disconnect();
    }

    const pusher = getPusherClient(authUrl);
    pusherRef.current = pusher;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind('exam:started', () => {
      setStep('STARTED');
    });

    channel.bind('exam:finished', () => {
      setStep('ID');
      setExamData(null);
    });

    channel.bind('student:kicked', (data: { ra: string }) => {
      if (data.ra === formData.ra) {
        setStep('EXPULLED');
        setExamData(null);
      }
    });

    return () => {};
  }, [formData.ra, formData.code, step]);

  useEffect(() => {
    if (step === 'ID' || step === 'FINISHED' || step === 'EXPULLED') {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelRef.current = null;
      }
    }
  }, [step]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'profacher_answer') {
        const { answer } = event.data;
        if (event.data.questionId) {
          handleSelectOption(event.data.questionId, answer);
        } else {
          console.warn("Mensagem profacher_answer recebida sem questionId", event.data);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [submissionId]);

  // Sentinel: Monitoramento de Integridade (Silencioso)
  useEffect(() => {
    if (step !== 'LIVE' || !submissionId || !formData.code || !formData.ra) return;

    let lastAlertTime = 0;
    const ALERT_COOLDOWN = 3000; // Evitar spam de alertas se o aluno alternar rápido demais

    const triggerAlert = async () => {
      const now = Date.now();
      if (now - lastAlertTime < ALERT_COOLDOWN) return;
      
      lastAlertTime = now;
      console.log("Sentinel: Alerta de integridade detectado.");
      await reportFocusLoss(examData?.id || 0, formData.ra);
    };

    const handleBlur = () => triggerAlert();
    const handleVisibilityChange = () => {
      // Alerta se a aba for escondida OU se sair do modo tela cheia
      if (document.visibilityState === 'hidden' || !document.fullscreenElement) {
        triggerAlert();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleVisibilityChange); // Tratar saída de fullscreen como perda de foco

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleVisibilityChange);
    };
  }, [step, submissionId, formData.code, formData.ra, examData?.id]);

  useEffect(() => {
    if (step === 'STARTED') {
      const timer = setTimeout(async () => {
        try {
          const result = await getLiveExamQuestions(formData.code, formData.name, formData.ra);
          
          if (!result) {
            console.error("❌ Erro de Rede: A Server Action retornou indefinido.");
            alert("Erro de conexão com o servidor. Por favor, recarregue a página.");
            setStep('ID');
            return;
          }

          if (result.success) {
            setExamData(result.exam);
            setSubmissionId(result.submissionId ?? null);
            if (result.previousAnswers) {
              setAnswers((result.previousAnswers as Record<number, any>) || {});
            }

            // NOVA LÓGICA: Se houver instruções (descrição), mostra a tela de aceite
            console.log("📝 Dados da prova carregados. Instruções presentes:", !!result.exam?.description);
            if (result.exam?.description && result.exam.description.trim() !== "") {
              console.log("🚀 Mudando para o passo: INSTRUCTIONS");
              setStep('INSTRUCTIONS');
            } else {
              console.log("🚀 Indo direto para: LIVE");
              setStep('LIVE');
            }
          } else {
            console.warn("⚠️ Falha ao carregar questões:", result.error);
            if (result.error?.includes("revogado")) {
              setStep('EXPULLED');
            } else {
              alert(result.error || "Erro ao carregar questões.");
              setStep('ID');
            }
          }
        } catch (error) {
          console.error("❌ Falha fatal ao carregar questões:", error);
          alert("Ocorreu um erro inesperado ao carregar sua prova.");
          setStep('ID');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, formData]);

  if (step === 'EXPULLED') {
    return (
      <div className="bg-[#121315] min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
            <span className="material-symbols-outlined text-5xl">block</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white">ACESSO REVOGADO</h1>
            <p className="text-gray-400 leading-relaxed">O seu acesso a esta sala de prova foi interrompido por decisão da moderação do professor.</p>
          </div>
          <button onClick={() => window.location.href = '/'} className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all font-bold">VOLTAR AO INÍCIO</button>
        </div>
      </div>
    );
  }

  if (step === 'UNSUPPORTED_BROWSER') {
    return (
      <div className="bg-[#121315] min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
            <span className="material-symbols-outlined text-5xl text-primary">browser_updated</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-white">NAVEGADOR NÃO SUPORTADO</h1>
            <p className="text-gray-400 leading-relaxed">
              Detectamos que você está utilizando o Microsoft Edge. Para garantir a segurança e estabilidade da sua prova, 
              o **Google Chrome** é obrigatório.
            </p>
          </div>
          <div className="space-y-4">
            <a 
              href="https://www.google.com/chrome/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-6 bg-primary text-black rounded-2xl transition-all font-black text-lg block shadow-2xl shadow-primary/20 hover:scale-105"
            >
              BAIXAR GOOGLE CHROME
            </a>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Por favor, instale o Chrome e tente novamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectOption = async (questionId: number, optionIdOrValue: any) => {
    if (!submissionId) return;
    
    let finalAnswer: any;
    if (typeof optionIdOrValue === 'string' && (optionIdOrValue.endsWith('_V') || optionIdOrValue.endsWith('_F'))) {
      const [optIdStr, val] = optionIdOrValue.split('_');
      const optId = parseInt(optIdStr);
      const currentQAnswer = answers[questionId] || {};
      finalAnswer = { ...currentQAnswer, [optId]: val };
    } else {
      finalAnswer = optionIdOrValue;
    }

    // 1. Atualização Instantânea da UI (Optimistic Update)
    setAnswers(prev => ({ ...prev, [questionId]: finalAnswer }));
    setSavingStatus(prev => ({ ...prev, [questionId]: 'saving' }));

    // 2. Debouncing: Limpar gravação agendada anteriormente para esta questão
    if (saveTimeoutsRef.current[questionId]) {
      clearTimeout(saveTimeoutsRef.current[questionId]);
    }

    // 3. Agendar gravação no servidor (800ms de inatividade)
    saveTimeoutsRef.current[questionId] = setTimeout(async () => {
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
      
      // Limpar referência do timeout concluído
      delete saveTimeoutsRef.current[questionId];
    }, 800);
  };


  const handleFinish = async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      const result = await finishExamLive(submissionId!);
      if (result.success) {
        setScoreData({ 
          score: result.score!, 
          maxScore: result.maxScore!,
          details: result.details || [],
          showScore: result.showScore ?? false
        });
        setStep('FINISHED');
      } else {
        alert("Erro ao finalizar prova: " + result.error);
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10 transition-all duration-700">
        
        {(step === 'ID' || step === 'WAITING' || step === 'STARTED' || step === 'INSTRUCTIONS') && (
          <div className="liquid-glass p-10 rounded-[3rem] border border-outline-variant shadow-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-black text-on-surface tracking-tight">Profacher <span className="text-primary">2.0</span></h1>
              <p className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] opacity-60">Portal de Avaliação Digital</p>
            </div>

            {step === 'ID' && (
              <form onSubmit={handleJoin} className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-widest">Seu Nome Completo</label>
                    <input type="text" required placeholder="Ex: JOÃO SILVA DE ALMEIDA" className="w-full bg-white/5 border border-outline rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg font-medium uppercase" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-widest">RA (Matrícula)</label>
                      <input type="text" required placeholder="Ex: 123456" className="w-full bg-white/5 border border-outline rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg font-medium" value={formData.ra} onChange={(e) => setFormData({...formData, ra: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 ml-4 uppercase tracking-widest">Código da Prova</label>
                      <input type="text" required maxLength={5} placeholder="Ex: AX78B" className="w-full bg-white/5 border border-outline rounded-[1.5rem] py-5 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg font-medium uppercase tracking-[0.3em] text-primary" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-6 bg-primary text-black rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                  {loading ? <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" /> : <>ENTRAR NA SALA <span className="material-symbols-outlined font-black">arrow_forward</span></>}
                </button>
              </form>
            )}

            {step === 'WAITING' && (
              <div className="text-center space-y-12 py-10 animate-in fade-in zoom-in duration-1000">
                <div className="relative w-40 h-40 mx-auto">
                  <div className="absolute inset-4 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
                  <div className="absolute inset-0 border-[3px] border-outline-variant rounded-full" />
                  <div className="absolute inset-0 border-[3px] border-primary border-t-transparent rounded-full animate-premium-spin shadow-[0_0_15px_rgba(192,193,255,0.3)]" />
                  <div className="absolute inset-4 border-[1px] border-outline rounded-full animate-[premium-spin_3s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-outline shadow-xl">
                      <span className="material-symbols-outlined text-4xl text-primary animate-pulse">hourglass_empty</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="inline-block px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Sincronizando com o Professor</p>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">AGUARDE UM MOMENTO...</h2>
                  <p className="text-gray-500 font-medium px-4 leading-relaxed max-w-sm mx-auto">Sua conexão foi estabelecida com sucesso. <br/>Aguarde o comando de início do professor.</p>
                </div>
              </div>
            )}

            {step === 'STARTED' && (
              <div className="text-center space-y-8 py-10 animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center text-black mx-auto shadow-2xl shadow-primary/40 animate-bounce">
                  <span className="material-symbols-outlined text-5xl font-black">rocket_launch</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black">TUDO PRONTO!</h2>
                  <p className="text-gray-400 font-medium text-lg">Iniciando sua avaliação. Boa sorte!</p>
                </div>
                <div className="pt-4 animate-pulse">
                  <span className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black tracking-[0.3em] flex items-center justify-center gap-2 w-fit mx-auto">
                    <span className="material-symbols-outlined text-sm">security</span>
                    SENTINEL ATIVADO
                  </span>
                </div>
              </div>
            )}
            {step === 'INSTRUCTIONS' && examData && (
              <div className="space-y-8 animate-in fade-in zoom-in duration-700 max-h-[70vh] flex flex-col">
                <div className="flex items-center gap-4 bg-primary/10 p-6 rounded-3xl border border-primary/20 shrink-0">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg">
                    <span className="material-symbols-outlined font-black">info</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Instruções da Prova</h2>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Leia atentamente antes de começar</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/5 rounded-[2rem] border border-outline-variant p-8 prose prose-invert max-w-none">
                   <MathRenderer content={examData.description || ''} className="text-gray-300 leading-relaxed text-lg" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 shrink-0">
                   <button 
                      onClick={() => {
                        setStep('ID');
                        setExamData(null);
                      }} 
                      className="py-6 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-[2rem] font-bold transition-all border border-transparent hover:border-red-500/20"
                   >
                      REJEITAR E SAIR
                   </button>
                   <button 
                      onClick={() => setStep('LIVE')} 
                      className="py-6 bg-primary text-black rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                      LI E ACEITO <span className="material-symbols-outlined font-black">check_circle</span>
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'LIVE' && examData && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#121315] animate-modal-rise italic-none">
            <header className="h-24 liquid-glass border-b border-white/5 flex items-center justify-between px-10 shrink-0">
               <div>
                  <h2 className="text-xl font-black text-primary uppercase tracking-tighter">{examData.title}</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{formData.name} &bull; RA: {formData.ra}</p>
               </div>
               <button onClick={() => setStep('REVIEW')} className="bg-primary/10 text-primary border border-primary/20 px-8 py-3 rounded-full font-black text-xs hover:bg-primary hover:text-black transition-all flex items-center gap-2 group">
                  REVISAR E ENTREGAR
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">send</span>
               </button>
            </header>
            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-[1400px] mx-auto space-y-12 pb-24">
                {examData.questions.map((q: any, index: number) => {
                  const [enunciation, code] = q.type === 'CUSTOM_HTML' 
                    ? (q.content.includes(CODE_SEPARATOR) ? q.content.split(CODE_SEPARATOR) : ["", q.content])
                    : [q.content, ""];

                  return (
                    <div key={q.id} className="liquid-glass p-10 rounded-[2.5rem] border border-outline-variant space-y-8 animate-modal-rise">
                      <div className="flex items-start justify-between">
                         <div className="flex items-center gap-4">
                            <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-outline-variant shrink-0">{index + 1}</span>
                            <div className="flex flex-col gap-0.5">
                               <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Peso da Questão</span>
                               <span className="text-xs font-bold text-primary">{q.points?.toFixed(1) || '0.0'} {q.points === 1 ? 'PONTO' : 'PONTOS'}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            {savingStatus[q.id] === 'saving' && <span className="text-[10px] font-bold text-gray-500 uppercase animate-pulse">Sincronizando...</span>}
                            {savingStatus[q.id] === 'saved' && <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> Salvo</span>}
                         </div>
                      </div>

                      {/* Enunciado (Sempre renderizado se não estiver vazio) */}
                      {enunciation && enunciation.trim() !== "" && (
                          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                             <MathRenderer className="text-2xl font-medium leading-relaxed exam-content" content={enunciation} />
                          </div>
                      )}

                      <div className="space-y-6">
                        {(q.type === 'ESSAY' || q.type === 'MATH') && (
                          <textarea className="w-full bg-white/5 border border-outline rounded-[2rem] p-8 text-lg text-on-surface outline-none focus:border-primary/40 transition-all min-h-[250px] resize-none" placeholder="Escreva sua resposta aqui..." value={answers[q.id] || ''} onChange={(e) => handleSelectOption(q.id, e.target.value)} />
                        )}
                        {q.type === 'TRUE_FALSE' && (
                          <div className="grid grid-cols-1 gap-6">
                            {q.options.map((opt: any) => (
                              <div key={opt.id} className="flex items-center gap-6 bg-white/[0.03] p-6 rounded-[2rem] border border-outline-variant">
                                <div className="flex gap-2">
                                  <button onClick={() => handleSelectOption(q.id, opt.id + "_V")} className={`w-12 h-12 rounded-xl border-2 transition-all font-black ${answers[q.id]?.[opt.id] === 'V' ? 'bg-green-500 text-black border-green-500' : 'border-outline text-gray-600'}`}>V</button>
                                  <button onClick={() => handleSelectOption(q.id, opt.id + "_F")} className={`w-12 h-12 rounded-xl border-2 transition-all font-black ${answers[q.id]?.[opt.id] === 'F' ? 'bg-red-500 text-black border-red-500' : 'border-outline text-gray-600'}`}>F</button>
                                </div>
                                <span className="text-xl font-medium text-gray-200">{opt.content}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'MULTIPLE_CHOICE' && (
                          <div className="space-y-4">
                            {q.options.map((opt: any) => (
                              <button key={opt.id} onClick={() => handleSelectOption(q.id, opt.id)} className={`w-full p-6 rounded-[1.5rem] border-2 text-left transition-all flex items-center gap-4 ${answers[q.id] === opt.id ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-transparent text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.id] === opt.id ? 'border-primary bg-primary' : 'border-gray-700'}`}>{answers[q.id] === opt.id && <div className="w-2 h-2 bg-black rounded-full" />}</div>
                                <span className="text-lg font-medium">{opt.content}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {q.type === 'CUSTOM_HTML' && (
                          <div className="w-full space-y-4">
                             <div className="flex items-center justify-between px-6 py-3 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                                <div className="flex items-center gap-2 text-cyan-500 font-bold text-[10px] uppercase tracking-widest">
                                   <span className="material-symbols-outlined text-sm">animation</span> Componente Interativo
                                </div>
                                <div className="text-[9px] text-gray-500 font-medium">Área de interação segura</div>
                             </div>
                             <div className="relative rounded-[2.5rem] overflow-hidden border border-outline-variant bg-black/40 shadow-2xl group/interactive h-[650px]">
                                <iframe 
                                   title={`interactive-q-${q.id}`}
                                   className="w-full h-full border-none"
                                   sandbox="allow-scripts allow-modals allow-popups"
                                   srcDoc={`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <style>
                                          body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
                                        </style>
                                      </head>
                                      <body>
                                        <script>
                                          const QUESTION_ID = ${q.id};
                                          window.PROFACHER_QUESTION_ID = QUESTION_ID;
                                          window.setAnswer = function(val) {
                                            window.parent.postMessage({ 
                                              type: 'profacher_answer', 
                                              questionId: QUESTION_ID, 
                                              answer: val 
                                            }, '*');
                                          };
                                          window.parent.postMessage({ type: 'profacher_ready', questionId: QUESTION_ID }, '*');
                                        </script>
                                        ${code}
                                      </body>
                                      </html>
                                   `}
                                />
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/interactive:opacity-100 transition-opacity">
                                   <p className="text-[10px] text-center text-gray-400">Interaja com o componente acima para responder</p>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          </div>
        )}

        {step === 'FINISHED' && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#121315] animate-in fade-in duration-700">
            <header className="h-24 liquid-glass border-b border-white/5 flex items-center justify-between px-10 shrink-0">
               <div>
                  <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Relatório de Performance</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{formData.name} &bull; RA: {formData.ra}</p>
               </div>
               <div className="flex items-center gap-4">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                    Avaliação Processada
                  </span>
               </div>
            </header>

            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="max-w-[1400px] mx-auto w-full space-y-16 pb-32">
                <div className="text-center space-y-6 pt-10">
                  <div className="w-24 h-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center text-green-500 mx-auto border border-green-500/20 shadow-2xl">
                    <span className="material-symbols-outlined text-5xl">verified</span>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-7xl font-black text-white tracking-tighter">Prova Finalizada!</h1>
                    <p className="text-gray-400 text-xl font-medium">Análise técnica e pedagógica concluída.</p>
                  </div>
                </div>

                {scoreData?.showScore ? (
                  <div className="space-y-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                      <div className="lg:col-span-12 xl:col-span-4 liquid-glass p-12 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center space-y-8 min-h-[450px]">
                        <div className="relative w-72 h-72 flex items-center justify-center">
                           <svg className="w-full h-full -rotate-90">
                              <circle cx="144" cy="144" r="128" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-white/5" />
                              <circle 
                                cx="144" cy="144" r="128" stroke="currentColor" strokeWidth="20" fill="transparent" 
                                strokeDasharray={804.25}
                                strokeDashoffset={804.25 - (804.25 * (scoreData.score / scoreData.maxScore))}
                                strokeLinecap="round"
                                className="text-primary transition-all duration-1000 ease-out" 
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                              <span className="text-6xl font-black text-white leading-none">
                                {((scoreData.score / scoreData.maxScore) * 100).toFixed(0)}%
                              </span>
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-3">Aproveitamento Global</span>
                           </div>
                        </div>
                      </div>

                      <div className="lg:col-span-12 xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2 liquid-glass p-12 rounded-[3rem] border border-white/5 flex flex-col justify-center space-y-4">
                           <p className="text-sm font-black text-gray-500 uppercase tracking-widest text-center">Sua Pontuação Final</p>
                           <p className="text-8xl font-black text-white tracking-tighter text-center">{scoreData.score.toFixed(1)} <span className="text-3xl text-gray-700 font-medium tracking-normal">/ {scoreData.maxScore} pts</span></p>
                        </div>
                        <div className="md:col-span-2 liquid-glass p-12 rounded-[3.5rem] border border-primary/20 bg-primary/5 flex items-center gap-10 group">
                           <div className="w-24 h-24 bg-primary/20 rounded-[2.5rem] flex items-center justify-center text-primary shrink-0 group-hover:rotate-12 transition-transform">
                              <span className="material-symbols-outlined text-5xl">auto_awesome</span>
                           </div>
                           <div className="space-y-2">
                              <p className="text-2xl font-black text-white">Correção via Inteligência Artificial</p>
                              <p className="text-gray-400 leading-relaxed max-w-2xl">Suas respostas foram validadas pelo motor neural baseando-se estritamente no gabarito do professor.</p>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-center justify-between border-b border-white/5 pb-8">
                        <h3 className="text-4xl font-black text-white tracking-tighter flex items-center gap-6">
                          <span className="material-symbols-outlined text-primary text-5xl">analytics</span>
                          Raio-X da Prova
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-12">
                        {scoreData.details.map((detail: any, idx: number) => {
                          const percentage = (detail.pointsObtained / detail.pointsTotal) * 100;
                          const isCorrect = percentage === 100;
                          const isPartial = percentage > 0 && percentage < 100;

                          return (
                            <div key={idx} className="liquid-glass p-12 rounded-[4rem] border border-outline-variant space-y-10 hover:border-outline transition-all group">
                               <div className="space-y-6">
                                  <div className="flex flex-col md:flex-row items-start gap-6">
                                     <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center font-black text-xl text-gray-500 shrink-0 border border-outline">
                                        {idx + 1}
                                     </div>
                                     <div className="flex-1 min-w-0 w-full overflow-hidden">
                                        <div className="break-words whitespace-pre-wrap w-full max-w-full">
                                           <MathRenderer 
                                              content={detail.question.includes(CODE_SEPARATOR) ? detail.question.split(CODE_SEPARATOR)[0] : detail.question} 
                                              className="text-xl md:text-2xl font-bold text-gray-100 leading-tight !p-0 block w-full overflow-hidden" 
                                           />
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center gap-4">
                                           <span className="inline-block px-4 py-1.5 bg-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{detail.type}</span>
                                           <div className={`px-6 py-2 rounded-full font-black text-sm flex items-center gap-2 ${isCorrect ? 'bg-green-500/10 text-green-500' : isPartial ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                              <span className="material-symbols-outlined text-base">{isCorrect ? 'check_circle' : isPartial ? 'hourglass_top' : 'cancel'}</span>
                                              {detail.pointsObtained.toFixed(1)} / {detail.pointsTotal} PTS
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               <div className="space-y-8 flex flex-col">
                                  {detail.tfResult && detail.tfResult.length > 0 ? (
                                     <div className="space-y-4">
                                        <p className="text-xs font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                                           <span className="material-symbols-outlined text-sm">checklist</span> análise premium (v/f)
                                        </p>
                                        <div className="grid grid-cols-1 gap-4">
                                           {detail.tfResult.map((tf: any, tfIdx: number) => (
                                              <div key={tfIdx} className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${tf.isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                                 <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${tf.isCorrect ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}>
                                                       {tf.isCorrect ? <span className="material-symbols-outlined text-sm">done</span> : <span className="material-symbols-outlined text-sm">close</span>}
                                                    </div>
                                                    <span className={`text-md font-medium ${tf.isCorrect ? 'text-green-100' : 'text-red-100'}`}>{tf.statement}</span>
                                                 </div>
                                                 <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex flex-col items-center">
                                                       <span className="text-[8px] font-black text-gray-500 uppercase mb-1">Você</span>
                                                       <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border-2 ${tf.studentVal === 'V' ? 'bg-green-500/20 border-green-500 text-green-400' : tf.studentVal === 'F' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-gray-700 text-gray-600'}`}>
                                                          {tf.studentVal}
                                                       </span>
                                                    </div>
                                                    <div className="w-4 h-[2px] bg-white/10 mt-4" />
                                                    <div className="flex flex-col items-center">
                                                       <span className="text-[8px] font-black text-gray-500 uppercase mb-1">Gabarito</span>
                                                       <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border-2 ${tf.expectedVal === 'V' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                                                          {tf.expectedVal}
                                                       </span>
                                                    </div>
                                                 </div>
                                              </div>
                                           ))}
                                        </div>
                                     </div>
                                  ) : (
                                     <>
                                        <div className="space-y-4">
                                           <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                              <span className="material-symbols-outlined text-sm">person</span> sua resposta
                                           </p>
                                           <div className="p-8 rounded-[2.5rem] bg-white/5 border border-outline-variant text-gray-300 min-h-[100px] text-lg leading-relaxed">
                                              {typeof detail.studentAnswer === 'object' ? 
                                                 <pre className="text-sm font-mono whitespace-pre-wrap">{JSON.stringify(detail.studentAnswer, null, 2)}</pre> 
                                                 : <div className="break-words whitespace-pre-wrap">{detail.studentAnswer}</div>
                                              }
                                           </div>
                                        </div>
                                        <div className="space-y-4">
                                           <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                              <span className="material-symbols-outlined text-sm">school</span> gabarito oficial indicado
                                           </p>
                                           <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 text-primary/90 min-h-[100px] text-lg leading-relaxed">
                                              <div className="break-words whitespace-pre-wrap">
                                                 <MathRenderer content={detail.correctAnswer} className="!p-0 text-lg opacity-90" />
                                              </div>
                                           </div>
                                        </div>
                                     </>
                                  )}
                               </div>

                               <div className="pt-10 border-t border-white/5 flex items-start gap-8">
                                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl ${detail.type === 'ESSAY' || detail.type === 'MATH' ? 'bg-primary/20 text-primary shadow-primary/10' : 'bg-white/5 text-gray-600'}`}>
                                     <span className="material-symbols-outlined text-3xl">{detail.type === 'ESSAY' || detail.type === 'MATH' ? 'auto_awesome' : 'info'}</span>
                                  </div>
                                  <div className="space-y-2">
                                     <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Análise do Avaliador:</p>
                                     <p className="text-gray-400 leading-relaxed text-lg italic opacity-80">
                                        "{detail.feedback}"
                                     </p>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                    <div className="liquid-glass p-20 rounded-[4rem] border border-outline-variant text-center space-y-8 max-w-4xl mx-auto mt-20">
                      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/20">
                         <span className="material-symbols-outlined text-5xl">verified</span>
                      </div>
                      <div className="space-y-4">
                        <h2 className="text-5xl font-black text-white tracking-tighter">PROVA ENTREGUE!</h2>
                        <p className="text-gray-400 text-xl font-medium">As configurações desta prova não permitem feedback imediato da nota. <br/>Aguarde a liberação dos resultados pelo professor.</p>
                      </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-8 pt-12">
                  <button 
                    onClick={() => generateExamPdf({
                      studentName: formData.name,
                      studentRa: formData.ra,
                      examTitle: examData?.title || 'Prova',
                      accessCode: formData.code,
                      date: new Date().toLocaleString('pt-BR'),
                      score: scoreData?.score || 0,
                      maxScore: scoreData?.maxScore || 0,
                      showScore: scoreData?.showScore ?? false,
                      details: scoreData?.details || []
                    })}
                    className="group relative flex items-center gap-4 py-6 px-12 bg-white/5 hover:bg-white/10 border border-outline rounded-[2rem] transition-all"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined font-black">download</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Documento Oficial</p>
                      <p className="text-xl font-black text-white">Baixar Comprovante (PDF)</p>
                    </div>
                  </button>

                  <div className="text-center pt-8 border-t border-white/5 w-full">
                    <p className="text-xs text-gray-600 font-bold tracking-[0.3em] uppercase">Profacher 2.0 &bull; Sistema de Avaliação Inteligente</p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}

        {step === 'REVIEW' && examData && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-[#121315]/95 backdrop-blur-xl animate-in fade-in">
            <header className="h-24 liquid-glass border-b border-white/5 flex items-center justify-between px-10">
               <div>
                  <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Revisão Final</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Confirme suas respostas</p>
               </div>
               <button onClick={() => setStep('LIVE')} className="text-gray-400 text-xs font-bold hover:text-white transition-colors uppercase tracking-widest">Voltar para Prova</button>
            </header>
            <main className="flex-1 overflow-y-auto p-10">
              <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {examData.questions.map((q: any, index: number) => (
                    <button key={q.id} onClick={() => setStep('LIVE')} className="p-8 rounded-[2.5rem] border border-outline bg-white/5 flex items-center gap-6 text-left hover:border-primary/50 transition-all group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${answers[q.id] ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-700'}`}>{index + 1}</div>
                      <div className="flex-1 min-w-0">
                         <p className={`text-[10px] font-black uppercase tracking-widest ${answers[q.id] ? 'text-primary' : 'text-gray-500'}`}>{answers[q.id] ? 'Concluída' : 'Pendente'}</p>
                         <p className="text-sm text-gray-400 truncate mt-1">Clique para editar</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-center pt-10">
                   <button 
                      onClick={handleFinish} 
                      disabled={loading}
                      className={`w-full max-w-md py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-primary text-black shadow-primary/20 hover:scale-105 active:scale-95'}`}
                   >
                      {loading ? (
                        <>
                          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                          PROCESSANDO...
                        </>
                      ) : (
                        "FINALIZAR E ENTREGAR"
                      )}
                   </button>
                </div>
              </div>
            </main>
          </div>
        )}

      </div>
    </div>
  );
}
