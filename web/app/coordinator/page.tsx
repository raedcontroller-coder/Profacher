'use client'

import React from 'react';
import { useState, useEffect, useTransition } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { getInstitutionUsers, inviteUserAction, deleteUserAction } from './actions';

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/coordinator', active: true },
  { icon: 'description', label: 'Provas', href: '/coordinator/exams', active: false },
  { icon: 'analytics', label: 'Resultados', href: '/coordinator/results', active: false },
  { icon: 'group', label: 'Gestão de Usuários', href: '/coordinator', active: true },
  { icon: 'settings', label: 'Configurações', href: '/coordinator/settings', active: false },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#121315]/80 backdrop-blur-xl border-r border-outline-variant/10 z-50 flex flex-col p-4">
      <div className="flex items-center gap-3 px-4 py-8 mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-black font-bold">menu_book</span>
        </div>
        <div>
          <h1 className="text-on-surface font-bold text-lg tracking-tight font-['Inter']">Profacher</h1>
          <p className="text-[10px] text-primary font-['Inter'] uppercase tracking-widest font-bold">Elite Examination System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              item.active 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-400 hover:text-white hover:bg-[#1f2021]'
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${item.active ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>
              {item.icon}
            </span>
            <span className="font-['Inter'] font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <Link href="/coordinator/new-exam" className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary transition-all text-primary hover:text-black py-4 rounded-2xl border border-primary/20 group shadow-lg">
          <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_circle</span>
          <span className="font-['Inter'] font-bold text-sm">Nova Prova</span>
        </Link>
        
        <div className="border-t border-outline-variant/10 pt-4 px-2 space-y-1">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2021] transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="font-['Inter'] font-medium text-sm">Sair</span>
          </button>
        </div>

        <div className="px-4 py-4 opacity-40 hover:opacity-100 transition-opacity flex justify-center text-white">
          <img src="/RaedLogo.svg" alt="Raed Technology" className="h-6 brightness-0 invert" />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ userName }: { userName: string }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-[#121315]/80 backdrop-blur-xl flex justify-between items-center px-8 border-b border-outline-variant/10">
      <div className="flex items-center gap-8">
        <span className="font-['Inter'] text-xs uppercase tracking-widest text-gray-400">Exam Intelligence</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/20">
          <div className="text-right">
            <p className="text-[10px] font-['Inter'] uppercase tracking-tighter text-gray-500">Coordenadora</p>
            <p className="text-xs font-bold text-on-surface font-['Inter']">{userName}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center font-bold text-sm ring-2 ring-primary/20 font-['Inter']">
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
}

function MetricCard() {
  return (
    <div className="col-span-12 lg:col-span-4 liquid-glass rounded-2xl p-8 relative overflow-hidden group shadow-2xl">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 bg-primary/10 text-primary font-['Inter'] text-[10px] uppercase tracking-widest rounded">AI Intelligence Hub</span>
        </div>
        <h3 className="text-gray-400 font-medium text-sm mb-1 font-['Inter']">Total de Tokens Consumidos</h3>
        <p className="text-4xl font-bold tracking-tighter text-on-surface font-['Inter']">
          0.0M <span className="text-sm font-normal text-gray-500 font-['Inter']">/ 20M</span>
        </p>
      </div>
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-[10px] font-['Inter'] text-gray-500 uppercase tracking-widest">
          <span>Cota Mensal</span>
          <span>0% Utilizado</span>
        </div>
        <div className="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
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
          <h3 className="font-bold text-2xl font-['Inter']">Cadastrar Novo Usuário</h3>
          <p className="text-on-surface-variant text-base font-['Inter']">Conceder acesso a coordenadores ou professores.</p>
        </div>
        <span className="material-symbols-outlined text-primary/30 text-5xl">person_add</span>
      </div>
      <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="font-['Inter'] text-xs uppercase tracking-widest text-gray-400 ml-1">Nome Completo</label>
          <input
            name="fullName"
            required
            className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3 px-4 focus:ring-2 focus:ring-primary/40 outline-none font-['Inter'] text-on-surface placeholder:text-gray-700"
            placeholder="ex: Ana Carolina"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-['Inter'] text-xs uppercase tracking-widest text-gray-400 ml-1">E-mail Institucional</label>
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
            className="w-full bg-primary hover:bg-primary-container text-black font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 font-['Inter'] text-base" 
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
    <section className="bg-[#1f2021] rounded-2xl overflow-hidden shadow-xl border border-outline-variant/10">
      <div className="p-8 flex items-center justify-between bg-[#292a2b]/40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h3 className="font-bold text-2xl font-['Inter']">Diretório de Usuários</h3>
          <div className="h-8 w-px bg-outline-variant/30" />
          <span className="text-sm font-['Inter'] text-gray-500 tracking-widest uppercase">{users.length} USUÁRIOS ATIVOS</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#292a2b]/20">
            <tr>
              {['Pessoal', 'Cargo', 'Data de Criação', 'Ações'].map((h, i) => (
                <th key={h} className={`px-8 py-5 font-['Inter'] text-xs uppercase tracking-widest text-gray-500 ${i === 3 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {users.map((user) => {
              return (
                <tr key={user.id} className="group hover:bg-[#343536]/40 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary text-lg border border-primary/20 font-['Inter'] shadow-inner">
                        {user.fullName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-base font-['Inter']">{user.fullName}</p>
                        <p className="text-sm text-gray-500 font-['Inter']">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-lg text-xs font-['Inter'] font-bold border border-primary/20 bg-primary/5 text-primary uppercase tracking-wider">
                      {user.role.name}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm text-on-surface-variant font-['Inter']">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {String(user.id) !== String(currentUserId) ? (
                      <button 
                        onClick={() => { if(confirm(`Excluir ${user.fullName}?`)) onDelete(user.id) }}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all active:scale-90"
                      >
                        <span className="material-symbols-outlined text-2xl">delete</span>
                      </button>
                    ) : (
                      <span className="text-xs font-['Inter'] text-gray-500/50 italic px-4">Sua Conta</span>
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

export default function CoordinatorPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = (session?.user as any)?.id;
  const currentUserName = session?.user?.name || "Usuário";

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
      {/* BACKGROUND IMAGE - RESTORED */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      
      <Sidebar />
      <TopBar userName={currentUserName} />

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
              <div className="w-full max-w-xs space-y-1 text-right text-gray-500 uppercase font-['Inter'] text-[10px] tracking-widest">
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
