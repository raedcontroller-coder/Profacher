'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getPusherClient } from '@/lib/pusher';
import { startExamLive, stopExamLive, getExamForMonitor, kickStudent } from '../../actions';

export default function ExamMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const examId = Number(params.id);

  const [exam, setExam] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const pusherRef = useRef<any>(null);

  // 1. Carregar dados da prova
  useEffect(() => {
    async function loadData() {
      const res = await getExamForMonitor(examId);
      if (res.success) {
        setExam(res.exam);
      }
      setLoading(false);
    }
    loadData();
  }, [examId]);

  // 2. Configurar Pusher Presence
  useEffect(() => {
    if (!exam?.accessCode || pusherRef.current) return;

    const pusher = getPusherClient();
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`presence-exam-${exam.accessCode}`);

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const list: any[] = [];
      members.each((member: any) => list.push(member.info));
      setParticipants(list);
    });

    channel.bind('pusher:member_added', (member: any) => {
      setParticipants(prev => {
        if (prev.find(p => p.ra === member.info.ra)) return prev;
        return [...prev, member.info];
      });
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setParticipants(prev => prev.filter(p => p.ra !== member.info.ra));
    });

    return () => {
      pusher.unsubscribe(`presence-exam-${exam.accessCode}`);
      pusherRef.current = null;
    };
  }, [exam?.accessCode]);

  const handleToggleExamStatus = async () => {
    setStarting(true);
    const isStarted = exam?.status === 'STARTED';
    const res = isStarted ? await stopExamLive(examId) : await startExamLive(examId);
    
    if (res.success) {
      const update = await getExamForMonitor(examId);
      if (update.success) setExam(update.exam);
    } else {
      alert("Erro ao alterar status: " + res.error);
    }
    setStarting(false);
  };

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
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${
                  exam?.status === 'STARTED' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                  : 'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {exam?.status === 'STARTED' ? 'PROVA EM ANDAMENTO' : 'SALA DE ESPERA ATIVA'}
                </span>
                <span className="text-gray-500 font-mono text-xs italic">ID: {examId}</span>
              </div>
              <h1 className="text-4xl font-black">
                {exam?.title}
              </h1>
              <p className="text-gray-400">Acompanhe a entrada dos alunos na sala de espera.</p>
              
              <button 
                onClick={() => router.push(`/professor/exams/${examId}/results`)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl text-xs font-black hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-sm">analytics</span>
                IR PARA PAINEL DE RESULTADOS E ENTREGAS
              </button>
            </div>

            <button 
              onClick={handleToggleExamStatus}
              disabled={starting}
              className={`px-10 py-6 font-black rounded-[2rem] transition-all shadow-2xl flex items-center gap-4 text-xl ${
                exam?.status === 'STARTED' 
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30' 
                : 'bg-primary text-black hover:scale-105 shadow-primary/30'
              }`}
            >
              {starting ? (
                <div className={`w-6 h-6 border-4 rounded-full animate-spin ${exam?.status === 'STARTED' ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
              ) : (
                <>
                  <span className="material-symbols-outlined text-3xl">
                    {exam?.status === 'STARTED' ? 'cancel' : 'rocket_launch'}
                  </span>
                  {exam?.status === 'STARTED' ? 'FINALIZAR PROVA' : 'INICIAR PROVA AGORA'}
                </>
              )}
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 liquid-glass rounded-[2.5rem] border border-outline-variant p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  Alunos na Sala
                </h3>
                <span className="px-4 py-1 bg-white/5 rounded-full border border-white/5 text-sm font-mono tracking-widest text-primary">
                   {participants.length} PRESENTES
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const allSubs = exam?.submissions || [];
                  const activeRAs = new Set(participants.map(p => p.ra));
                  
                  const merged = [...participants.map(p => ({ ...p, isOnline: true }))];
                  
                  allSubs.forEach((sub: any) => {
                    const isExpelled = sub.isExpelled || false;
                    if (!activeRAs.has(sub.studentRa)) {
                      merged.push({
                        name: sub.studentName,
                        ra: sub.studentRa,
                        finishedAt: sub.finishedAt,
                        isOnline: false,
                        isExpelled: isExpelled
                      } as any);
                    } else {
                      const subInActive = merged.find(m => m.ra === sub.studentRa);
                      if (subInActive) {
                        subInActive.finishedAt = sub.finishedAt;
                        (subInActive as any).isExpelled = isExpelled;
                      }
                    }
                  });

                  merged.sort((a, b) => a.name.localeCompare(b.name));

                  if (merged.length === 0) {
                    return (
                      <div className="py-20 text-center space-y-4 opacity-30">
                        <span className="material-symbols-outlined text-6xl">person_search</span>
                        <p className="text-lg font-medium">Aguardando a conexão do primeiro aluno...</p>
                      </div>
                    );
                  }

                  return merged.map((p, i) => (
                    <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${p.isExpelled ? 'bg-red-500/10 border-red-500/30' : p.finishedAt ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${p.isExpelled ? 'bg-red-500/20 text-red-400' : p.finishedAt ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'}`}>
                          {p.name?.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold text-lg ${p.isExpelled ? 'text-red-200 line-through' : p.finishedAt ? 'text-blue-200' : 'text-on-surface'}`}>{p.name}</p>
                          <p className={`text-xs font-mono tracking-tighter ${p.isExpelled ? 'text-red-500' : 'text-gray-500'}`}>RA: {p.ra}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {p.isExpelled ? (
                          <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase rounded-full shadow-lg shadow-red-500/20">BLOQUEADO</span>
                        ) : p.finishedAt ? (
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-full border border-blue-500/20 flex items-center gap-2">
                             <span className="material-symbols-outlined text-xs">verified</span>
                             FINALIZADO
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border flex items-center gap-2 ${p.isOnline ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                              {p.isOnline ? 'Online' : 'Offline'}
                            </span>
                            
                            <button 
                              onClick={async () => {
                                if (!confirm(`Expulsar "${p.name}"?`)) return;
                                await kickStudent(examId, p.ra);
                                const update = await getExamForMonitor(examId);
                                if (update.success) setExam(update.exam);
                              }}
                              className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center transition-all border border-white/5"
                            >
                              <span className="material-symbols-outlined text-lg">person_remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="space-y-8">
               <div className="liquid-glass rounded-[2.5rem] border border-primary/30 p-8 text-center space-y-4 bg-primary/5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Código de Acesso</p>
                  <div className="text-6xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                    {exam?.accessCode}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Instrua os alunos a acessarem:<br/> <span className="text-gray-300">/prova/{exam?.accessCode}</span></p>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
