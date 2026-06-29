'use client'

import React, { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { getInstitutionUsers, inviteUserAction, deleteUserAction, getPendingInvitationsAction, cancelInvitationAction } from '../actions';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { Pagination } from '@/components/shared/Pagination';

function InviteCard({ onInvite }: { onInvite: (data: { fullName: string, email: string, roleName: string }) => void }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const roleName = formData.get('roleName') as string;

    startTransition(async () => {
      onInvite({ fullName, email, roleName });
    });
  };

  return (
    <div className="col-span-12 liquid-glass rounded-2xl p-8 flex flex-col justify-between shadow-2xl border border-white/5">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="font-bold text-2xl">Cadastrar Novo Usuário</h3>
          <p className="text-on-surface-variant text-body-lg">Conceder acesso a coordenadores ou professores.</p>
        </div>
        <span className="material-symbols-outlined text-primary/30 text-5xl">person_add</span>
      </div>
      <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <div className="space-y-1.5">
          <label className="text-caption text-gray-400 ml-1">Cargo</label>
          <select
            name="roleName"
            required
            className="w-full bg-[#0d0e0f] border border-outline-variant/30 rounded-xl text-base py-3.5 px-4 focus:ring-2 focus:ring-primary/40 outline-none font-['Inter'] text-on-surface"
          >
            <option value="PROFESSOR">Professor(a)</option>
            <option value="COORDINATOR">Coordenador(a)</option>
          </select>
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

function PendingInvitesTable({ invites, onCancel }: { invites: any[], onCancel: (id: string) => void }) {
  if (invites.length === 0) return null;

  return (
    <section className="bg-[#1f2021] rounded-2xl overflow-hidden shadow-xl border border-outline-variant mt-8">
      <div className="p-8 flex items-center justify-between bg-[#292a2b]/40 border-b border-outline-variant">
        <div className="flex items-center gap-6">
          <h3 className="font-bold text-2xl text-yellow-500">Convites Pendentes</h3>
          <div className="h-8 w-px bg-outline-variant" />
          <span className="text-caption text-gray-500">{invites.length} AGUARDANDO ACEITE</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-admin w-full text-left">
          <thead>
            <tr>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">E-mail Convidado</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Cargo</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Data de Envio</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {invites.map((invite) => (
              <tr key={invite.id} className="group hover:bg-[#343536]/40 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-yellow-500/50 text-3xl">mark_email_unread</span>
                    <div>
                      <p className="font-bold text-subtitle text-yellow-500">{invite.email}</p>
                      <p className="text-body text-gray-500">Expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 uppercase tracking-wider">
                    {invite.role.name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="text-body text-on-surface-variant">
                    {new Date(invite.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/register?token=${invite.token}`;
                      navigator.clipboard.writeText(link);
                      alert('Link de convite copiado para a área de transferência!');
                    }}
                    className="p-2 rounded-lg hover:bg-primary/10 text-gray-500 hover:text-primary transition-all active:scale-90"
                    title="Copiar Link de Convite (Porto Seguro)"
                  >
                    <span className="material-symbols-outlined text-2xl">content_copy</span>
                  </button>
                  <button 
                    onClick={() => { if(confirm(`Cancelar convite para ${invite.email}?`)) onCancel(invite.id) }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all active:scale-90"
                    title="Cancelar Convite"
                  >
                    <span className="material-symbols-outlined text-2xl">cancel</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserTable({ users, onDelete, currentUserId }: { users: any[], onDelete: (id: number) => void, currentUserId?: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
        <table className="table-admin w-full text-left">
          <thead>
            <tr>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Pessoal</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Cargo</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Data de Criação</th>
              <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {paginatedUsers.map((user) => {
              return (
                <tr key={user.id} className="group hover:bg-[#343536]/40 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/5 to-primary/5 flex items-center justify-center font-bold text-primary text-xl border border-white/5 shadow-inner">
                        {user.fullName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-subtitle">{user.fullName}</p>
                        <p className="text-body text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold border border-white/5 bg-primary/5 text-primary uppercase tracking-wider">
                      {user.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-body text-on-surface-variant">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
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
      <div className="p-4 border-t border-outline-variant">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </section>
  );
}

export default function UsersClient({ initialUserName }: { initialUserName?: string }) {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = (session?.user as any)?.id;
  const isLoadingSession = status === "loading";
  const currentUserName = initialUserName || session?.user?.name || (isLoadingSession ? "Carregando..." : "Usuário");

  async function loadUsers() {
    try {
      const [dataUsers, dataInvites] = await Promise.all([
        getInstitutionUsers(),
        getPendingInvitationsAction()
      ]);
      setUsers(dataUsers);
      setInvites(dataInvites);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleInvite(data: { fullName: string, email: string, roleName: string }) {
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

  async function handleCancelInvite(id: string) {
    await cancelInvitationAction(id);
    loadUsers();
  }

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
          <section className="grid grid-cols-1 gap-8">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface font-['Inter']">Gestão de Pessoal</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl font-['Inter'] leading-relaxed">
                Adicione professores e coordenadores à sua instituição.
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-8">
            <InviteCard onInvite={handleInvite} />
          </section>

          {loading ? (
             <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
          ) : (
            <>
              <PendingInvitesTable invites={invites} onCancel={handleCancelInvite} />
              <UserTable users={users} onDelete={handleDelete} currentUserId={currentUserId} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
