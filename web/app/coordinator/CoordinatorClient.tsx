'use client'

import React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { getInstitutionUsers, inviteUserAction, deleteUserAction } from './actions';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';


function MetricCard() {
  return (
    <div className="col-span-12 lg:col-span-4 liquid-glass rounded-2xl p-8 relative overflow-hidden group shadow-2xl">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-caption rounded">AI Intelligence Hub</span>
        </div>
        <h3 className="text-gray-400 font-medium text-body-sm mb-1">Total de Tokens Consumidos</h3>
        <p className="text-4xl font-bold tracking-tighter text-on-surface">
          0.0M <span className="text-body font-normal text-gray-500">/ 20M</span>
        </p>
      </div>
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-caption text-gray-500">
          <span>Cota Mensal</span>
          <span>0% Utilizado</span>
        </div>
        <div className="h-1.5 w-full bg-outline-variant rounded-full overflow-hidden">
          <div className="h-full w-[2%] bg-primary rounded-full shadow-[0_0_10px_rgba(192,193,255,0.5)]" />
        </div>
      </div>
    </div>
  );
}

function InviteCard({ onInvite }: { onInvite: (data: { fullName: string, email: string }) => void }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    startTransition(async () => {
      onInvite({ fullName, email });
    });
  };

  return (
    <div className="col-span-12 lg:col-span-8 liquid-glass rounded-2xl p-8 flex flex-col justify-between shadow-2xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="font-bold text-2xl">Cadastrar Novo Usuário</h3>
          <p className="text-on-surface-variant text-body-lg">Conceder acesso a coordenadores ou professores.</p>
        </div>
        <span className="material-symbols-outlined text-primary/30 text-5xl">person_add</span>
      </div>
      <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="text-caption text-gray-400 ml-1">Nome Completo</label>
          <input
            name="fullName"
            required
            className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none font-['Inter'] text-on-surface placeholder:text-gray-700"
            placeholder="ex: Ana Carolina"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-caption text-gray-400 ml-1">E-mail Institucional</label>
          <input
            name="email"
            type="email"
            required
            className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none font-['Inter'] text-on-surface placeholder:text-gray-700"
            placeholder="email@fecap.br"
          />
        </div>
        <div className="flex flex-col justify-end">
          <button 
            disabled={isPending}
            className="btn-primary" 
            type="submit"
          >
            {isPending ? 'Processando...' : 'Enviar Convite'}
          </button>
        </div>
      </form>
    </div>
  );
}

function UserTable({ users, onDelete, currentUserId }: { users: any[], onDelete: (id: number) => void, currentUserId?: string }) {
  return (
    <section className="bg-[#1f2021] rounded-2xl overflow-hidden shadow-xl border border-outline-variant">
      <div className="p-8 flex items-center justify-between bg-[#292a2b]/40 border-b border-outline-variant">
        <div className="flex items-center gap-6">
          <h3 className="font-bold text-2xl">Diretório de Usuários</h3>
          <div className="h-8 w-px bg-outline-variant" />
          <span className="text-caption text-gray-500">{users.length} USUÁRIOS ATIVOS</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-admin">
          <thead>
            <tr>
              {['Pessoal', 'Cargo', 'Data de Criação', 'Ações'].map((h, i) => (
                <th key={h} className={i === 3 ? 'text-right' : ''}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {users.map((user) => {
              return (
                <tr key={user.id} className="group hover:bg-[#343536]/40 transition-colors">
                  <td>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary text-xl border border-primary/20 shadow-inner">
                        {user.fullName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-subtitle">{user.fullName}</p>
                        <p className="text-body text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="px-3 py-1 rounded-lg text-body font-bold border border-primary/20 bg-primary/5 text-primary uppercase tracking-wider">
                      {user.role.name}
                    </span>
                  </td>
                  <td>
                    <p className="text-body text-on-surface-variant">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="text-right">
                    {String(user.id) !== String(currentUserId) ? (
                      <button 
                        onClick={() => { if(confirm(`Excluir ${user.fullName}?`)) onDelete(user.id) }}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all active:scale-90"
                      >
                        <span className="material-symbols-outlined text-2xl">delete</span>
                      </button>
                    ) : (
                      <span className="text-body text-gray-500/50 italic px-4">Sua Conta</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CoordinatorClient({ initialUserName }: { initialUserName?: string }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = (session?.user as any)?.id;
  const isLoadingSession = status === "loading";
  
  // Prioridade 1: Nome vindo via Prop (imediato do servidor)
  // Prioridade 2: Nome da sessão cliente (atualizado)
  // Fallback: Usuário
  const currentUserName = initialUserName || session?.user?.name || (isLoadingSession ? "Carregando..." : "Usuário");

  async function loadUsers() {
    try {
      const data = await getInstitutionUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleInvite(data: { fullName: string, email: string }) {
    const result = await inviteUserAction(data);
    if (result?.error) {
      alert(result.error);
    } else {
      alert("Usuário convidado com sucesso!");
      loadUsers();
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteUserAction(id);
    if (result.error) {
      alert(result.error);
    } else {
      loadUsers();
    }
  }

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar role="COORDENADOR" />
      <TopBar userName={currentUserName} roleLabel="Coordenadora" />

      <main className="pl-64 pt-16 min-h-screen relative z-10">
        <div className="p-12 max-w-[1700px] mx-auto space-y-10">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-4xl font-bold tracking-tight text-on-surface font-['Inter']">Gestão da Instituição</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl font-['Inter'] leading-relaxed">
                Controle o acesso, monitore o uso de IA e gerencie o pessoal do ecossistema acadêmico.
              </p>
            </div>
            <div className="flex items-end justify-end">
              <div className="w-full max-w-xs space-y-1 text-right text-gray-500 uppercase font-['Inter'] text-base tracking-widest">
                <span>Instituição Atual</span>
                <div className="liquid-glass p-3 rounded-xl flex items-center justify-between mt-1">
                  <span className="material-symbols-outlined text-primary">account_balance</span>
                  <span className="font-bold text-sm tracking-tight text-on-surface">Colégio FECAP</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-12 gap-8">
            <MetricCard />
            <InviteCard onInvite={handleInvite} />
          </section>

          {loading ? (
             <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
          ) : (
            <UserTable users={users} onDelete={handleDelete} currentUserId={currentUserId} />
          )}

          <section className="liquid-glass p-10 rounded-2xl flex items-center gap-10 relative overflow-hidden shadow-2xl border border-primary/10">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-[240px]">shield_person</span>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <span className="material-symbols-outlined text-4xl text-primary">security</span>
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-bold mb-2 font-['Inter']">Protocolo de Log de Auditoria</h4>
              <p className="text-on-surface-variant text-base max-w-2xl font-['Inter'] leading-relaxed">
                Cada ação administrativa é registrada com segurança para accountability institucional. Você está visualizando o sistema como Coordenadora do Colégio FECAP.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
