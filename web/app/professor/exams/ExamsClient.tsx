'use client'

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import Link from 'next/link';
import { getTeacherExams, deleteExam, openExamRoom } from './actions';

interface Exam {
  id: number;
  title: string;
  description: string | null;
  createdAt: Date;
  accessCode: string | null;
  status: 'DRAFT' | 'WAITING' | 'STARTED' | 'FINISHED';
  _count: {
    questions: number;
  };
}

export default function ExamsClient({ userName }: { userName: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadExams = async () => {
    setLoading(true);
    try {
      const result = await getTeacherExams();
      if (result.success && result.exams) {
        setExams(result.exams as any);
      }
    } catch (e) {
      console.error("Erro ao carregar provas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDelete = async (id: number, title: string) => {
    if (confirm(`Tem certeza que deseja excluir a prova "${title}"? Esta ação não pode ser desfeita.`)) {
      try {
        const result = await deleteExam(id);
        if (result.success) {
          setExams(exams.filter(e => e.id !== id));
        } else {
          alert("Erro ao excluir: " + result.error);
        }
      } catch (e) {
        alert("Erro ao excluir prova.");
      }
    }
  };

  const handleOpenRoom = async (id: number) => {
    try {
      const result = await openExamRoom(id);
      if (result.success) {
        // Atualizar estado local
        setExams(exams.map(e => e.id === id ? { ...e, accessCode: result.accessCode!, status: 'WAITING' } : e));
      } else {
        alert("Erro ao abrir sala: " + result.error);
      }
    } catch (e) {
      alert("Erro ao abrir sala da prova.");
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* Background elements */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1600px] mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tight text-on-surface">Minhas <span className="text-primary">Provas</span></h2>
              <p className="text-gray-400">Gerencie suas avaliações criadas e organizadas por grupos.</p>
            </div>
            
            <Link 
              href="/professor/new-exam" 
              className="flex items-center gap-2 bg-primary text-black font-bold px-6 py-4 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Criar Nova Prova
            </Link>
          </header>

          {/* Filters & Search */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="liquid-glass p-4 rounded-3xl border border-outline-variant flex items-center gap-4">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar prova pelo título..." 
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Exams List */}
          <section className="animate-in fade-in zoom-in-95 duration-1000 delay-400">
            <div className="liquid-glass rounded-[2.5rem] border border-outline-variant overflow-hidden">
              <table className="table-admin">
                <thead>
                  <tr>
                    <th>Título / Descrição</th>
                    <th>Status / Acesso</th>
                    <th>Questões</th>
                    <th>Criado em</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                          <p className="text-gray-500 font-mono uppercase tracking-widest text-xs">Carregando provas...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredExams.length > 0 ? (
                    filteredExams.map((exam) => (
                      <tr key={exam.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td>
                          <div className="flex flex-col gap-1">
                            <Link 
                              href={`/professor/exams/${exam.id}/monitor`}
                              className="font-bold text-lg text-on-surface hover:text-primary transition-colors cursor-pointer block"
                            >
                              {exam.title}
                            </Link>
                            <span className="text-sm text-gray-500 line-clamp-1">{exam.description || 'Sem descrição'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-black mb-1">Código de Acesso</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-2xl font-black text-white bg-[#1a1b1e] px-4 py-2 rounded-2xl border-2 border-primary/30 shadow-lg shadow-primary/5 min-w-[100px] text-center">
                                {exam.accessCode || '---'}
                              </span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(exam.accessCode || '');
                                  alert('Código copiado!');
                                }}
                                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all"
                                title="Copiar código"
                              >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                             <div className="px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20 text-secondary text-sm font-bold">
                               {exam._count.questions} questões
                             </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-gray-400 text-sm">
                            {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              href={`/professor/exams/${exam.id}/monitor`}
                              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-black font-black hover:scale-105 transition-all shadow-xl shadow-secondary/20"
                              title="Monitorar Sala (Waiting Room)"
                            >
                              <span className="material-symbols-outlined text-xl">monitor</span>
                            </Link>

                            <Link 
                              href={`/professor/exams/${exam.id}/results`}
                              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-black font-black hover:scale-105 transition-all shadow-xl shadow-primary/20"
                              title="Ver Resultados e Entregas"
                            >
                              <span className="material-symbols-outlined text-xl">analytics</span>
                              Resultados
                            </Link>
                            
                            <Link 
                              href={`/professor/exams/${exam.id}/edit`}
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${exam.status === 'STARTED' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white/5 text-gray-400 hover:bg-primary/20 hover:text-primary'}`}
                              title={exam.status === 'STARTED' ? 'Não é possível editar em andamento' : 'Editar prova'}
                              onClick={(e) => exam.status === 'STARTED' && e.preventDefault()}
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </Link>
                            
                            <button 
                              onClick={() => handleDelete(exam.id, exam.title)}
                              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                              title="Excluir prova"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-24">
                        <div className="flex flex-col items-center gap-6 opacity-30">
                          <span className="material-symbols-outlined text-7xl">description</span>
                          <div className="space-y-2">
                            <p className="text-xl font-bold">Nenhuma prova encontrada</p>
                            <p className="text-sm">Comece criando sua primeira avaliação no botão lateral.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
