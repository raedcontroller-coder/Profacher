'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getExamForMonitor, kickStudent, getSubmissionDetails } from '../../actions';
import { generateTeacherSummaryPdf, generateFullDetailedClassPdf, generateExamPdf } from '@/lib/utils/pdf-generator';
import MathRenderer from '@/components/shared/MathRenderer';

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const examId = Number(params.id);

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'DELIVERY' | 'ALPHABETICAL' | 'SCORE'>('ALPHABETICAL');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 1. Carregar dados da prova de forma periódica para monitorar entregas
  useEffect(() => {
    async function loadData() {
      const res = await getExamForMonitor(examId);
      if (res.success) {
        setExam(res.exam);
      }
      setLoading(false);
    }

    loadData();
    const interval = setInterval(loadData, 10000); // Polling a cada 10s para resultados
    return () => clearInterval(interval);
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 selection:text-primary font-['Inter']">
      <Sidebar role="PROFESSOR" />
      <TopBar userName={session?.user?.name || "Professor"} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1200px] mx-auto space-y-12">
          
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase rounded-full">
                  PAINEL DE RESULTADOS
                </span>
                <button 
                   onClick={() => router.push(`/professor/exams/${examId}/monitor`)}
                   className="text-gray-500 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
                >
                   <span className="material-symbols-outlined text-sm">arrow_back</span>
                   Voltar ao Monitor
                </button>
              </div>
              <h1 className="text-4xl font-black tracking-tighter">
                {exam?.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                 <button 
                   onClick={() => generateTeacherSummaryPdf({
                     examTitle: exam.title,
                     accessCode: exam.accessCode,
                     date: new Date().toLocaleDateString(),
                     submissions: exam.submissions.map((s: any) => ({
                       studentName: s.studentName,
                       studentRa: s.studentRa,
                       score: s.score,
                       status: s.finishedAt ? 'Concluído' : 'Em Progresso',
                       startedAt: s.startedAt,
                       finishedAt: s.finishedAt
                     }))
                   })}
                   className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-xl text-xs font-black transition-all shadow-lg"
                 >
                   <span className="material-symbols-outlined text-sm">description</span>
                   Resumo da Turma (PDF)
                 </button>
                 <button 
                    onClick={async () => {
                      setLoadingDetails(true);
                      try {
                        const validReports = [];
                        for (const s of exam.submissions) {
                          const res = await getSubmissionDetails(s.id);
                          if (res.success) {
                            validReports.push({
                              studentName: res.studentName!,
                              studentRa: res.studentRa!,
                              examTitle: exam.title,
                              accessCode: exam.accessCode,
                              date: new Date().toLocaleDateString(),
                              score: res.score!,
                              maxScore: res.maxScore!,
                              details: res.report!.map((it: any) => ({
                                question: it.content,
                                studentAnswer: it.studentAnswer,
                                pointsTotal: it.points,
                                pointsObtained: 0, 
                                feedback: ""
                              }))
                            });
                          }
                        }
                        generateFullDetailedClassPdf(exam.title, exam.accessCode, validReports);
                      } catch (err) {
                        alert("Erro ao gerar relatório completo.");
                      } finally {
                        setLoadingDetails(false);
                      }
                    }}
                    disabled={loadingDetails}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary-container border border-secondary/20 rounded-xl text-xs font-black transition-all disabled:opacity-50"
                 >
                   <span className="material-symbols-outlined text-sm">history_edu</span>
                   {loadingDetails ? 'Processando...' : 'Relatório Detalhado (Geral)'}
                 </button>
              </div>
            </div>
          </header>

          <div className="liquid-glass rounded-[2.5rem] border border-outline-variant p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Desempenho da Turma
                </h3>
                <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                   <button 
                     onClick={() => setFilterType('ALPHABETICAL')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'ALPHABETICAL' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                   >A-Z</button>
                   <button 
                     onClick={() => setFilterType('DELIVERY')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'DELIVERY' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                   >ENTREGA</button>
                   <button 
                     onClick={() => setFilterType('SCORE')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'SCORE' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                   >NOTA</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                      <th className="py-4 px-2">Aluno / RA</th>
                      <th className="py-4 px-2">Início</th>
                      <th className="py-4 px-2 text-center">Progresso</th>
                      <th className="py-4 px-2">Status / Nota</th>
                      <th className="py-4 px-2 text-right">Detalhamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const merged = (exam?.submissions || []).map((s: any) => ({
                         id: s.id,
                         name: s.studentName,
                         ra: s.studentRa,
                         startedAt: s.startedAt,
                         finishedAt: s.finishedAt,
                         score: s.score,
                         answers: s.answers || {},
                         isExpelled: s.isExpelled
                      }));

                      // Aplicar Filtros
                      merged.sort((a: any, b: any) => {
                        if (filterType === 'ALPHABETICAL') return a.name.localeCompare(b.name);
                        if (filterType === 'DELIVERY') return (b.finishedAt ? new Date(b.finishedAt).getTime() : 0) - (a.finishedAt ? new Date(a.finishedAt).getTime() : 0);
                        if (filterType === 'SCORE') return (b.score || 0) - (a.score || 0);
                        return 0;
                      });

                      if (merged.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-20 text-center opacity-30">
                               <span className="material-symbols-outlined text-6xl block mb-4">analytics</span>
                               <p className="text-lg font-medium">Nenhum resultado disponível ainda.</p>
                            </td>
                          </tr>
                        );
                      }

                      return merged.map((p: any, i: number) => {
                        const totalQuestions = exam?._count?.questions || 0;
                        const answeredCount = Object.keys(p.answers || {}).length;
                        const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

                        return (
                          <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-5 px-2">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${p.isExpelled ? 'bg-red-500/20 text-red-400' : p.finishedAt ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'}`}>
                                  {p.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-gray-100">{p.name}</p>
                                  <p className="text-[10px] font-mono text-gray-500 tracking-tighter">RA: {p.ra}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-2 text-xs text-gray-400 font-medium">
                               {p.startedAt ? new Date(p.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="py-5 px-2">
                               <div className="w-24 mx-auto space-y-2">
                                  <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase">
                                     <span>{answeredCount}/{totalQuestions} Q</span>
                                     <span>{Math.round(progress)}%</span>
                                  </div>
                                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                     <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 px-2">
                               {p.isExpelled ? (
                                 <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-full border border-red-500/20">BLOQUEADO</span>
                               ) : p.finishedAt ? (
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black text-blue-400">{p.score?.toFixed(1)} PTS</span>
                                    <span className="text-[8px] text-gray-500 uppercase font-bold">CONCLUÍDO</span>
                                 </div>
                               ) : (
                                 <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full border border-primary/20">EM CURSO</span>
                               )}
                            </td>
                            <td className="py-5 px-2 text-right">
                               <button 
                                 onClick={async () => {
                                   setLoadingDetails(true);
                                   const res = await getSubmissionDetails(p.id);
                                   if (res.success) setSelectedSubmission(res);
                                   setLoadingDetails(false);
                                 }}
                                 className="px-4 py-2 rounded-lg bg-white/5 hover:bg-primary hover:text-black flex items-center gap-2 text-[10px] font-black transition-all ml-auto uppercase"
                               >
                                 <span className="material-symbols-outlined text-sm">visibility</span>
                                 Ver Prova
                               </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      </main>

      {/* Modal de Detalhes do Aluno (Reaproveitado) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedSubmission(null)} />
           <div className="relative w-full max-w-[1000px] h-[90vh] liquid-glass rounded-[3rem] border border-white/10 flex flex-col overflow-hidden min-w-0">
              
              <header className="p-10 border-b border-white/5 flex items-center justify-between shrink-0">
                 <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white">{selectedSubmission.studentName}</h2>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">RA: {selectedSubmission.studentRa} &bull; Nota: {selectedSubmission.score?.toFixed(1) || '0.0'} / {selectedSubmission.maxScore?.toFixed(1)}</p>
                 </div>
                 <button onClick={() => setSelectedSubmission(null)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 border border-white/5 transition-all">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-black/20">
                 {selectedSubmission.report.map((it: any, idx: number) => (
                    <div key={idx} className="space-y-4 p-8 rounded-3xl bg-white/5 border border-white/5">
                       <div className="flex items-start gap-4 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</span>
                          <div className="space-y-4 flex-1 min-w-0 overflow-hidden">
                             <div className="text-lg font-bold text-gray-100 break-words max-w-full overflow-hidden">
                                <MathRenderer content={it.content} className="!p-0 max-w-full overflow-x-hidden" />
                             </div>
                             <div className="space-y-4 pt-4 border-t border-white/5">
                                {it.tfResult && it.tfResult.length > 0 ? (
                                   <div className="space-y-4">
                                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Detalhamento V/F</p>
                                      <div className="grid grid-cols-1 gap-2">
                                         {it.tfResult.map((tf: any, tfIdx: number) => (
                                            <div key={tfIdx} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${tf.isCorrect ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                                               <div className="flex items-center gap-3">
                                                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${tf.isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                                                     {tf.isCorrect ? '✓' : '✕'}
                                                  </div>
                                                  <span className="text-sm text-gray-200">{tf.statement}</span>
                                               </div>
                                               <div className="flex items-center gap-2 shrink-0">
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tf.studentVal === 'V' ? 'bg-green-500/10 border-green-500/30 text-green-400' : tf.studentVal === 'F' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-gray-500/10 border-gray-500/30 text-gray-400'}`}>Aluno: {tf.studentVal}</span>
                                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tf.expectedVal === 'V' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>Gab: {tf.expectedVal}</span>
                                               </div>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                ) : (
                                   <>
                                      <div>
                                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Resposta do Aluno</p>
                                         <div className="p-4 rounded-xl bg-white/5 text-gray-300 text-sm italic break-words whitespace-pre-wrap max-w-full overflow-hidden">
                                            {it.studentAnswer || 'Sem resposta'}
                                         </div>
                                      </div>
                                      {it.correctAnswer && (
                                         <div>
                                            <p className="text-[10px] font-black text-primary/50 uppercase tracking-widest mb-2">Gabarito Sugerido</p>
                                            <div className="p-4 rounded-xl bg-primary/5 text-primary/70 text-sm break-words whitespace-pre-wrap max-w-full overflow-hidden">{it.correctAnswer}</div>
                                         </div>
                                      )}
                                   </>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>

              <footer className="p-8 border-t border-white/5 flex justify-end shrink-0 bg-surface">
                 <button 
                   onClick={() => generateExamPdf({
                     studentName: selectedSubmission.studentName,
                     studentRa: selectedSubmission.studentRa,
                     examTitle: exam.title,
                     accessCode: exam.accessCode,
                     date: new Date().toLocaleDateString(),
                     score: selectedSubmission.score || 0,
                     maxScore: selectedSubmission.maxScore || 10,
                     details: selectedSubmission.report.map((it: any) => ({
                       question: it.content,
                       studentAnswer: it.studentAnswer,
                       pointsTotal: it.points,
                       pointsObtained: 0,
                       feedback: ""
                     }))
                   })}
                   className="px-8 py-3 bg-primary text-black font-black rounded-xl hover:scale-105 transition-all flex items-center gap-2"
                 >
                   <span className="material-symbols-outlined text-lg">download</span>
                   BAIXAR PDF INDIVIDUAL
                 </button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
}
