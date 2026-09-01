'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getExamForMonitor, kickStudent, getSubmissionDetails, updateManualGrade, updateSubmissionQuickData } from '../../actions';
import { generateTeacherSummaryPdf, generateFullDetailedClassPdf, generateExamPdf } from '@/lib/utils/pdf-generator';
import MathRenderer from '@/components/shared/MathRenderer';
import { Pagination } from '@/components/shared/Pagination';

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [manualPoints, setManualPoints] = useState<string>('');
  const [manualFeedback, setManualFeedback] = useState<string>('');
  const [savingManualGrade, setSavingManualGrade] = useState(false);

  const [editingStudent, setEditingStudent] = useState(false);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentRa, setEditStudentRa] = useState("");
  const [editStudentScore, setEditStudentScore] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [quickEditSubmission, setQuickEditSubmission] = useState<any>(null);

  useEffect(() => { setCurrentPage(1); }, [filterType]);

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

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1200px] mx-auto space-y-12">
          
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-black/5 dark:border-white/[0.02] text-[10px] font-black uppercase rounded-full">
                  PAINEL DE RESULTADOS
                </span>
                <button 
                   onClick={() => router.push(`/professor/exams/${examId}/monitor`)}
                   className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
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
                     submissions: [...exam.submissions]
                       .sort((a: any, b: any) => a.studentName.localeCompare(b.studentName))
                       .map((s: any) => ({
                         studentName: s.studentName,
                         studentRa: s.studentRa,
                         score: s.score,
                         status: s.finishedAt ? 'Concluído' : 'Em Progresso',
                         startedAt: s.startedAt,
                         finishedAt: s.finishedAt
                       }))
                   })}
                   className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-black/5 dark:border-white/[0.02] rounded-xl text-xs font-black transition-all shadow-lg"
                 >
                   <span className="material-symbols-outlined text-sm">description</span>
                   Resumo da Turma (PDF)
                 </button>
                 <button 
                    onClick={async () => {
                      setLoadingDetails(true);
                      try {
                        const validReports = [];
                        const sortedSubmissions = [...exam.submissions].sort((a: any, b: any) => a.studentName.localeCompare(b.studentName));
                        for (const s of sortedSubmissions) {
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
                              showScore: true,
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
                    className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-gray-800 dark:text-gray-300 border border-black/5 dark:border-white/[0.02] rounded-xl text-xs font-black transition-all disabled:opacity-50"
                 >
                   <span className="material-symbols-outlined text-sm">history_edu</span>
                   {loadingDetails ? 'Processando...' : 'Relatório Detalhado (Geral)'}
                 </button>
              </div>
            </div>
          </header>

          {(() => {
            const allSubs = exam?.submissions || [];
            const totalStudents = allSubs.length;
            const finishedSubs = allSubs.filter((s: any) => s.finishedAt && !s.isExpelled);
            const inProgressCount = allSubs.filter((s: any) => !s.finishedAt && !s.isExpelled).length;
            const blockedCount = allSubs.filter((s: any) => s.isExpelled).length;

            const scores = finishedSubs.map((s: any) => s.score || 0);
            const avgScore = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
            const highestScore = scores.length ? Math.max(...scores) : 0;
            const lowestScore = scores.length ? Math.min(...scores) : 0;

            const top3 = [...finishedSubs].sort((a: any, b: any) => (b.score || 0) - (a.score || 0)).slice(0, 3);

            // Agregação de acertos por questão (baseado nas correções já processadas)
            const questionMap = new Map<number, { content: string, obtained: number, possible: number }>();
            finishedSubs.forEach((s: any) => {
              const details = (s.correctionDetails as any[]) || [];
              details.forEach((d: any) => {
                if (!d?.questionId) return;
                const entry = questionMap.get(d.questionId) || { content: d.question, obtained: 0, possible: 0 };
                entry.obtained += d.pointsObtained || 0;
                entry.possible += d.pointsTotal || 0;
                questionMap.set(d.questionId, entry);
              });
            });
            const questionStats = Array.from(questionMap.entries())
              .map(([id, v]) => ({ id, content: v.content, accuracy: v.possible > 0 ? (v.obtained / v.possible) * 100 : 0 }))
              .sort((a, b) => b.accuracy - a.accuracy);

            const total = totalStudents || 1;
            const pieSegments = [
              { label: 'Concluído', count: finishedSubs.length, color: '#22c55e' },
              { label: 'Em Andamento', count: inProgressCount, color: '#eab308' },
              { label: 'Bloqueado', count: blockedCount, color: '#ef4444' },
            ].filter(s => s.count > 0);
            const circumference = 2 * Math.PI * 70;
            let cumulative = 0;
            const arcs = pieSegments.map(s => {
              const pct = s.count / total;
              const dash = pct * circumference;
              const offset = cumulative * circumference;
              cumulative += pct;
              return { ...s, dash, offset };
            });

            const accuracyColor = (pct: number) => pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
            const podiumStyle = [
              { badge: 'bg-amber-500 text-black', card: 'bg-amber-500/10 border-amber-500/30' },
              { badge: 'bg-gray-300 text-black', card: 'bg-gray-400/10 border-gray-400/30' },
              { badge: 'bg-orange-600 text-white', card: 'bg-orange-700/10 border-orange-700/30' },
            ];

            return (
              <div className="liquid-glass rounded-[2.5rem] border border-outline-variant p-8 space-y-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">insights</span>
                  Desempenho Geral
                </h3>

                {/* Métricas rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total de Alunos', value: totalStudents, icon: 'groups' },
                    { label: 'Nota Média', value: avgScore.toFixed(1).replace('.', ','), icon: 'analytics' },
                    { label: 'Maior Nota', value: highestScore.toFixed(1).replace('.', ','), icon: 'trending_up' },
                    { label: 'Menor Nota', value: lowestScore.toFixed(1).replace('.', ','), icon: 'trending_down' },
                  ].map(m => (
                    <div key={m.label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <span className="material-symbols-outlined text-primary text-lg">{m.icon}</span>
                      <p className="text-2xl font-black text-white">{m.value}</p>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Gráfico de pizza: status das entregas */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Status das Entregas</p>
                    {totalStudents === 0 ? (
                      <p className="text-gray-500 text-sm py-10 text-center">Nenhum aluno na sala ainda.</p>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-white/5" />
                            {arcs.map(a => (
                              <circle
                                key={a.label}
                                cx="80" cy="80" r="70"
                                stroke={a.color}
                                strokeWidth="16"
                                fill="transparent"
                                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                                strokeDashoffset={-a.offset}
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white">{totalStudents}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Alunos</span>
                          </div>
                        </div>
                        <div className="space-y-3 w-full sm:w-auto">
                          {pieSegments.map(s => (
                            <div key={s.label} className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="text-sm text-gray-300">{s.label}</span>
                              <span className="text-sm font-black text-white ml-auto sm:ml-4">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top 3 alunos */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Top 3 Alunos</p>
                    <div className="space-y-3">
                      {top3.length === 0 && (
                        <p className="text-gray-500 text-sm py-10 text-center">Nenhum aluno finalizou a prova ainda.</p>
                      )}
                      {top3.map((s: any, idx: number) => (
                        <div key={s.id} className={`p-4 rounded-2xl border flex items-center gap-4 ${podiumStyle[idx].card}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${podiumStyle[idx].badge}`}>
                            {idx + 1}º
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-white truncate">{s.studentName}</p>
                            <p className="text-[10px] text-gray-500 font-mono">RA: {s.studentRa}</p>
                          </div>
                          <p className="text-lg font-black text-white shrink-0">{(s.score || 0).toFixed(1).replace('.', ',')} <span className="text-[10px] text-gray-500 font-bold">PTS</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ranking de questões por acerto */}
                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Questões: Mais Acertadas → Mais Erradas</p>
                  {questionStats.length === 0 ? (
                    <p className="text-gray-500 text-sm py-6 text-center">Ainda não há correções processadas para gerar o ranking.</p>
                  ) : (
                    <div className="space-y-4">
                      {questionStats.map((q, idx) => (
                        <div key={q.id} className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-gray-600 w-5 shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <MathRenderer content={q.content} className="!p-0 text-xs text-gray-300 truncate" />
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
                              <div className="h-full rounded-full transition-all" style={{ width: `${q.accuracy}%`, backgroundColor: accuracyColor(q.accuracy) }} />
                            </div>
                          </div>
                          <span className="text-xs font-black w-12 text-right shrink-0" style={{ color: accuracyColor(q.accuracy) }}>{q.accuracy.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="liquid-glass rounded-[2.5rem] border border-outline-variant p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Desempenho dos Alunos
                </h3>
                <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
                   <button 
                     onClick={() => setFilterType('ALPHABETICAL')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'ALPHABETICAL' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                   >A-Z</button>
                   <button 
                     onClick={() => setFilterType('DELIVERY')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'DELIVERY' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                   >ENTREGA</button>
                   <button 
                     onClick={() => setFilterType('SCORE')}
                     className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filterType === 'SCORE' ? 'bg-primary text-black' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                   >NOTA</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                      <th className="py-4 px-2">Aluno / RA</th>
                      <th className="py-4 px-2">Início</th>
                      <th className="py-4 px-2 text-center">Alertas (Sentinel)</th>
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
                            <td colSpan={6} className="py-20 text-center opacity-30">
                               <span className="material-symbols-outlined text-6xl block mb-4">analytics</span>
                               <p className="text-lg font-medium">Nenhum resultado disponível ainda.</p>
                            </td>
                          </tr>
                        );
                      }

                      const totalPages = Math.ceil(merged.length / ITEMS_PER_PAGE);
                      const paginatedMerged = merged.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                      return paginatedMerged.map((p: any, i: number) => {
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
                                  <p className="font-bold text-sm text-on-surface">{p.name}</p>
                                  <p className="text-[10px] font-mono text-gray-500 tracking-tighter">RA: {p.ra}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                               {p.startedAt ? new Date(p.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="py-5 px-2 text-center">
                               {p.focusLoses > 0 ? (
                                 <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full border border-amber-500/20">
                                   {p.focusLoses} {p.focusLoses === 1 ? 'Alerta' : 'Alertas'}
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-black text-gray-600 uppercase">Nenhum</span>
                               )}
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
                                    <span className="text-xs font-black text-blue-400">{p.score?.toFixed(1).replace('.', ',')} PTS</span>
                                    <span className="text-[8px] text-gray-500 uppercase font-bold">CONCLUÍDO</span>
                                 </div>
                               ) : (
                                 <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase rounded-full border border-black/5 dark:border-white/[0.02]">EM CURSO</span>
                               )}
                            </td>
                            <td className="py-5 px-2 text-right">
                               <div className="flex items-center justify-end gap-2">
                                 <button 
                                   onClick={() => {
                                      setQuickEditSubmission(p);
                                      setEditStudentName(p.name || "");
                                      setEditStudentRa(p.ra || "");
                                      setEditStudentScore(String(p.score ?? "0"));
                                   }}
                                   className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all"
                                   title="Edição Rápida (Nome, RA, Nota)"
                                 >
                                   <span className="material-symbols-outlined text-sm">edit</span>
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     setLoadingDetails(true);
                                     const res = await getSubmissionDetails(p.id);
                                     if (res.success) {
                                       setSelectedSubmission(res);
                                     }
                                     setLoadingDetails(false);
                                   }}
                                   className="px-4 py-2 rounded-lg bg-white/5 hover:bg-primary hover:text-black flex items-center gap-2 text-[10px] font-black transition-all uppercase"
                                 >
                                   <span className="material-symbols-outlined text-sm">visibility</span>
                                   Ver Prova
                                 </button>
                               </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              
              {exam?.submissions?.length > 0 && (
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={Math.ceil(exam.submissions.length / ITEMS_PER_PAGE)} 
                  onPageChange={setCurrentPage} 
                />
              )}
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
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                       RA: {selectedSubmission.studentRa} &bull; 
                       Nota: {selectedSubmission.score?.toFixed(1).replace('.', ',') || '0,0'} / {selectedSubmission.maxScore?.toFixed(1).replace('.', ',')} &bull; 
                       Alertas Sentinel: {selectedSubmission.focusLoses || 0}
                    </p>
                 </div>
                 <button onClick={() => setSelectedSubmission(null)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 border border-white/5 transition-all">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </header>

              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-black/20">
                 {selectedSubmission.report.map((it: any, idx: number) => {
                    const isPending = it.feedback?.includes('Correção Pendente');
                    return (
                    <div key={idx} className={`space-y-4 p-8 rounded-3xl bg-white/5 border ${isPending ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5'}`}>
                       <div className="flex items-start gap-4 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</span>
                           <div className="space-y-4 flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-start justify-between gap-4">
                                 <div className="text-lg font-bold text-gray-100 break-words max-w-full overflow-hidden flex-1">
                                    <MathRenderer content={it.content} className="!p-0 max-w-full overflow-x-hidden" />
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                   <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${it.pointsObtained >= it.points ? 'bg-green-500/10 border-green-500/20 text-green-400' : it.pointsObtained > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                       {it.pointsObtained?.toFixed(1).replace('.', ',') || '0,0'} / {it.points?.toFixed(1).replace('.', ',')} PTS
                                   </div>
                                   <button 
                                     onClick={() => {
                                       setEditingQuestionId(it.questionId);
                                       setManualPoints(String(it.pointsObtained));
                                       setManualFeedback(it.feedback || '');
                                     }}
                                     className="w-8 h-8 rounded-full border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all"
                                     title="Corrigir Manualmente"
                                   >
                                     <span className="material-symbols-outlined text-sm">edit</span>
                                   </button>
                                 </div>
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
                                            {(() => {
                                               if (!it.studentAnswer) return 'Sem resposta';
                                               try {
                                                 const parsed = JSON.parse(it.studentAnswer);
                                                 if (parsed.development !== undefined) {
                                                    return (
                                                       <div className="space-y-4 not-italic">
                                                         <div className="p-4 bg-white rounded-[1.5rem] overflow-hidden flex justify-center">
                                                           {parsed.development ? <img src={parsed.development} alt="Desenvolvimento" className="max-w-full rounded-lg" /> : <p className="text-black/50 text-center text-sm">Nenhum desenvolvimento</p>}
                                                         </div>
                                                         <div className="font-bold text-gray-200 bg-white/5 p-4 rounded-xl border border-white/10">Resposta Final: {parsed.answer || ''}</div>
                                                       </div>
                                                    );
                                                 }
                                               } catch (e) {}
                                               return it.studentAnswer;
                                            })()}
                                         </div>
                                      </div>
                                      {(it.correctAnswer || it.referenceDevelopment) && (
                                         <div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Gabarito Sugerido</p>
                                            <div className="space-y-4">
                                               {it.referenceDevelopment && (
                                                   <div className="p-4 bg-white rounded-[1.5rem] overflow-hidden flex justify-center">
                                                       <img src={it.referenceDevelopment} alt="Gabarito de Desenvolvimento" className="max-w-full rounded-lg" />
                                                   </div>
                                               )}
                                               {it.correctAnswer && (
                                                   <div className="p-4 rounded-xl bg-primary/5 text-primary/70 text-sm break-words whitespace-pre-wrap max-w-full overflow-hidden border border-black/5 dark:border-white/[0.02]">
                                                       {it.correctAnswer}
                                                   </div>
                                               )}
                                            </div>
                                         </div>
                                      )}
                                                                   {editingQuestionId === it.questionId ? (
                                         <div className="mt-6 p-6 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                                           <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                             <span className="material-symbols-outlined text-sm">edit_note</span>
                                             Correção Manual
                                           </h4>
                                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                             <div className="space-y-2">
                                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nota Atribuída</label>
                                               <input 
                                                 type="number" 
                                                 step="0.1"
                                                 min="0"
                                                 max={it.points}
                                                 value={manualPoints}
                                                 onChange={e => setManualPoints(e.target.value)}
                                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                                               />
                                             </div>
                                             <div className="md:col-span-3 space-y-2">
                                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Feedback / Justificativa</label>
                                               <input 
                                                 type="text" 
                                                 value={manualFeedback}
                                                 onChange={e => setManualFeedback(e.target.value)}
                                                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                                                 placeholder="Escreva um feedback para o aluno..."
                                               />
                                             </div>
                                           </div>
                                           <div className="flex justify-end gap-3 pt-2">
                                             <button 
                                               onClick={() => setEditingQuestionId(null)}
                                               className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                               disabled={savingManualGrade}
                                             >
                                               Cancelar
                                             </button>
                                             <button 
                                               onClick={async () => {
                                                 setSavingManualGrade(true);
                                                 const res = await updateManualGrade(selectedSubmission.id, it.questionId, Number(manualPoints), manualFeedback);
                                                 if (res.success) {
                                                   setSelectedSubmission((prev: any) => ({
                                                     ...prev,
                                                     score: res.newTotalScore,
                                                     report: prev.report.map((r: any) => 
                                                       r.questionId === it.questionId 
                                                         ? { ...r, pointsObtained: Number(manualPoints), feedback: manualFeedback }
                                                         : r
                                                     )
                                                   }));
                                                   setExam((prev: any) => ({
                                                     ...prev,
                                                     submissions: prev.submissions.map((s: any) => 
                                                       s.id === selectedSubmission.id ? { ...s, score: res.newTotalScore } : s
                                                     )
                                                   }));
                                                   setEditingQuestionId(null);
                                                 } else {
                                                   alert("Erro ao salvar nota: " + res.error);
                                                 }
                                                 setSavingManualGrade(false);
                                               }}
                                               disabled={savingManualGrade}
                                               className="px-6 py-2 rounded-xl bg-primary text-black text-xs font-black hover:scale-105 transition-all disabled:opacity-50"
                                             >
                                               {savingManualGrade ? 'Salvando...' : 'Salvar Correção'}
                                             </button>
                                           </div>
                                         </div>
                                       ) : it.feedback ? (
                                         <div className={`mt-4 p-5 rounded-2xl flex items-start gap-3 border ${isPending ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/5 border-primary/10'}`}>
                                            <span className={`material-symbols-outlined text-xl ${isPending ? 'text-amber-500' : 'text-primary'}`}>
                                              {isPending ? 'warning' : 'smart_toy'}
                                            </span>
                                            <div className="space-y-1">
                                               <p className={`text-[10px] font-black uppercase tracking-widest ${isPending ? 'text-amber-500' : 'text-primary'}`}>
                                                 {isPending ? 'Aviso do Sistema' : 'Feedback da IA / Professor'}
                                               </p>
                                               <p className={`text-xs italic leading-relaxed ${isPending ? 'text-amber-200/70' : 'text-gray-400'}`}>{it.feedback}</p>
                                            </div>
                                         </div>
                                      ) : null}
                                   </>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 );
              })}
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
                     showScore: true,
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

      {/* Modal de Edição Rápida */}
      {quickEditSubmission && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setQuickEditSubmission(null)} />
           <div className="relative w-full max-w-[400px] liquid-glass rounded-3xl border border-white/10 p-8 space-y-6">
              <div className="space-y-1">
                 <h3 className="text-xl font-black text-white flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">edit</span>
                   Edição Rápida
                 </h3>
                 <p className="text-xs text-gray-400">Edite os dados do aluno ou corrija a nota total manualmente.</p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nome do Aluno</label>
                   <input 
                     type="text" 
                     value={editStudentName}
                     onChange={e => setEditStudentName(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">RA / Matrícula</label>
                   <input 
                     type="text" 
                     value={editStudentRa}
                     onChange={e => setEditStudentRa(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nota Total</label>
                   <input 
                     type="number" 
                     step="0.1"
                     value={editStudentScore}
                     onChange={e => setEditStudentScore(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                   />
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                 <button 
                   onClick={() => setQuickEditSubmission(null)}
                   className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-colors"
                   disabled={savingStudent}
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={async () => {
                      setSavingStudent(true);
                      const res = await updateSubmissionQuickData(quickEditSubmission.id, editStudentName, editStudentRa, Number(editStudentScore));
                      if (res.success) {
                         setExam((prev: any) => ({
                           ...prev,
                           submissions: prev.submissions.map((s: any) => 
                             s.id === quickEditSubmission.id ? { ...s, studentName: editStudentName, studentRa: editStudentRa, score: Number(editStudentScore) } : s
                           )
                         }));
                         setQuickEditSubmission(null);
                      } else {
                         alert("Erro ao atualizar: " + res.error);
                      }
                      setSavingStudent(false);
                   }}
                   disabled={savingStudent}
                   className="px-6 py-2 rounded-xl bg-primary text-black text-xs font-black hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                 >
                   {savingStudent ? 'Salvando...' : 'Salvar Alterações'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
