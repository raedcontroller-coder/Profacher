'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getCoordinatorDashboardMetrics } from './actions';
import { Pagination } from '@/components/shared/Pagination';

function DashboardCard({ title, value, icon, subtitle, color }: { title: string, value: string | number, icon: string, subtitle?: string, color: 'primary' | 'green' | 'amber' }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    green: 'text-green-500 bg-green-500/10 border-green-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  };

  return (
    <div className="liquid-glass rounded-2xl p-6 relative overflow-hidden group shadow-xl">
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl transition-all opacity-20 group-hover:opacity-40 bg-${color === 'primary' ? 'primary' : color === 'green' ? 'green-500' : 'amber-500'}`} />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-400 font-medium text-sm uppercase tracking-wider">{title}</h3>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        </div>
        <div>
          <p className="text-4xl font-bold tracking-tighter text-on-surface">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-2 font-medium">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string, color: string }> = {
    DRAFT: { label: 'Rascunho', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
    WAITING: { label: 'Aguardando', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    STARTED: { label: 'Em Andamento', color: 'text-primary bg-primary/10 border-primary/20' },
    FINISHED: { label: 'Finalizada', color: 'text-green-500 bg-green-500/10 border-green-500/20' }
  };
  const config = map[status] || { label: status, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' };

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-widest ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function CoordinatorClient({ initialUserName }: { initialUserName?: string }) {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Dashboard recent exams table is smaller, let's keep 5 here

  const isLoadingSession = status === "loading";
  const currentUserName = initialUserName || session?.user?.name || (isLoadingSession ? "Carregando..." : "Usuário");

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await getCoordinatorDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error("Erro ao carregar métricas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar role="COORDENADOR" />
      <TopBar userName={currentUserName} roleLabel="Coordenadora" />

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-10">
          
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">Visão Geral da Instituição</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
                Acompanhe as métricas de engajamento, provas aplicadas e corpo docente ativo na plataforma.
              </p>
            </div>
          </section>

          {loading ? (
             <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
          ) : (
            <>
              {/* METRICS GRID */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard 
                  title="Total de Provas" 
                  value={metrics?.totalExams || 0} 
                  icon="description" 
                  color="primary"
                  subtitle="Criadas na instituição"
                />
                <DashboardCard 
                  title="Alunos Avaliados" 
                  value={metrics?.totalSubmissions || 0} 
                  icon="school" 
                  color="green"
                  subtitle="Submissões entregues"
                />
                <DashboardCard 
                  title="Provas Em Andamento" 
                  value={metrics?.activeExams || 0} 
                  icon="hourglass_top" 
                  color="amber"
                  subtitle="Alunos fazendo agora"
                />
                <DashboardCard 
                  title="Corpo Docente" 
                  value={metrics?.totalTeachers || 0} 
                  icon="group" 
                  color="primary"
                  subtitle="Professores cadastrados"
                />
              </section>

              {/* CHARTS & RECENT EXAMS */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visual Chart Card */}
                <div className="lg:col-span-5 liquid-glass rounded-2xl p-8 shadow-xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-1">Status das Avaliações</h3>
                    <p className="text-sm text-gray-400 mb-8">Distribuição das provas por estado de execução.</p>
                  </div>
                  
                  {metrics?.totalExams > 0 ? (
                    <div className="space-y-6">
                      {[
                        { label: 'Em Andamento', count: metrics.activeExams, color: 'bg-primary' },
                        { label: 'Finalizadas', count: metrics.totalExams - metrics.activeExams, color: 'bg-green-500' }
                      ].map((stat, idx) => {
                        const percentage = Math.round((stat.count / metrics.totalExams) * 100) || 0;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-bold text-gray-300">{stat.label}</span>
                              <span className="text-gray-500">{stat.count} ({percentage}%)</span>
                            </div>
                            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full ${stat.color} rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center opacity-30 py-10">
                      <div>
                        <span className="material-symbols-outlined text-5xl mb-2">analytics</span>
                        <p className="text-sm font-bold uppercase tracking-widest">Sem Dados Suficientes</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Exams Table */}
                <div className="lg:col-span-7 liquid-glass rounded-2xl shadow-xl border border-white/5 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-xl">Atividades Recentes</h3>
                      <p className="text-sm text-gray-400">Últimas avaliações criadas pelos professores.</p>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-gray-500 opacity-20">history</span>
                  </div>
                  
                  <div className="flex-1 overflow-x-auto p-4">
                    {metrics?.recentExams?.length > 0 ? (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="py-3 px-4 text-gray-500 font-bold text-[10px] uppercase tracking-wider">Prova</th>
                            <th className="py-3 px-4 text-gray-500 font-bold text-[10px] uppercase tracking-wider">Professor</th>
                            <th className="py-3 px-4 text-gray-500 font-bold text-[10px] uppercase tracking-wider text-center">Submissões</th>
                            <th className="py-3 px-4 text-gray-500 font-bold text-[10px] uppercase tracking-wider text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {metrics.recentExams.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((exam: any) => (
                            <tr key={exam.id} className="hover:bg-white/5 transition-colors group">
                              <td className="py-4 px-4">
                                <p className="font-bold text-sm text-gray-200 truncate max-w-[200px]" title={exam.title}>{exam.title}</p>
                                <p className="text-xs text-gray-500">{new Date(exam.createdAt).toLocaleDateString('pt-BR')}</p>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {exam.teacherName.charAt(0)}
                                  </div>
                                  <span className="text-sm text-gray-300">{exam.teacherName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono text-sm text-gray-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5">{exam.submissions}</span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <StatusBadge status={exam.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 py-10">
                        <span className="material-symbols-outlined text-5xl mb-2">assignment_add</span>
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhuma prova criada ainda</p>
                      </div>
                    )}
                  </div>
                  {metrics?.recentExams?.length > ITEMS_PER_PAGE && (
                    <div className="p-4 border-t border-white/5">
                      <Pagination currentPage={currentPage} totalPages={Math.ceil(metrics.recentExams.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} />
                    </div>
                  )}
                </div>

              </section>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
