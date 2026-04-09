'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher';

export default function StudentExamPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<'ID' | 'WAITING' | 'STARTED'>('ID');
  const [name, setName] = useState('');
  const [ra, setRa] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedMembers, setConnectedMembers] = useState(0);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ra) return;
    
    setLoading(true);
    // Simular um pequeno delay para feedback visual premium
    setTimeout(() => {
      setStep('WAITING');
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    if (step === 'WAITING' && code) {
      // Configurar o Pusher para o Presence Channel
      // Passamos o nome e RA via authParams para a nossa rota de API
      const pusher = getPusherClient();
      
      // Sobrescrever a auth padrão para passar os dados do aluno
      (pusher.config as any).auth = {
        params: {
          student_name: name,
          student_ra: ra
        }
      };

      const channel = pusher.subscribe(`presence-exam-${code}`);

      channel.bind('pusher:subscription_succeeded', (members: any) => {
        setConnectedMembers(members.count);
      });

      channel.bind('pusher:member_added', () => {
        setConnectedMembers(prev => prev + 1);
      });

      channel.bind('pusher:member_removed', () => {
        setConnectedMembers(prev => prev - 1);
      });

      // Ouvir o início da prova
      channel.bind('exam:started', (data: any) => {
        setStep('STARTED');
        // Redirecionar para a primeira questão ou injetar interface de prova
        // router.push(`/prova/${code}/started`);
      });

      return () => {
        pusher.unsubscribe(`presence-exam-${code}`);
      };
    }
  }, [step, code, name, ra]);

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-outline-variant shadow-2xl space-y-8">
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-on-surface tracking-tight">
              Profacher <span className="text-primary">2.0</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-[0.2em]">Avaliação Digital</p>
          </div>

          {step === 'ID' && (
            <form onSubmit={handleJoin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 ml-2 uppercase">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: João Silva"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 ml-2 uppercase">RA (Registro Acadêmico)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 123456"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all text-lg"
                    value={ra}
                    onChange={(e) => setRa(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-black font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                   <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar na Sala
                    <span className="material-symbols-outlined font-bold">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'WAITING' && (
            <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="relative inline-block">
                <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="material-symbols-outlined text-primary text-3xl animate-pulse">hourglass_empty</span>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Quase pronto, {name.split(' ')[0]}!</h2>
                <p className="text-gray-400">Aguardando o professor iniciar a prova...</p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status da Sala</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  <span className="font-bold text-on-surface">{connectedMembers} alunos conectados</span>
                </div>
              </div>
              
              <p className="text-[10px] text-gray-600 uppercase font-mono tracking-tighter">
                Código da Prova: <span className="text-primary font-bold">{code}</span>
              </p>
            </div>
          )}

          {step === 'STARTED' && (
            <div className="text-center space-y-6 animate-in fade-in scale-110 duration-700">
              <span className="material-symbols-outlined text-7xl text-primary animate-bounce">rocket_launch</span>
              <h2 className="text-3xl font-black">PROVA INICIADA!</h2>
              <p className="text-gray-400">Boa sorte! Estamos preparando suas questões...</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
