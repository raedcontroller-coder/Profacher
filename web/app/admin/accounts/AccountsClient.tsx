'use client'

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { Pagination } from '@/components/shared/Pagination';
import {
  getIndividualAccounts, updateSubscriptionStatusAction, getVipCodes, generateVipCodeAction,
  getPlans, updatePlanAction, assignPlanToAccountAction, grantVipAction, adminDeleteProfessorAction
} from './actions';

interface Plan {
  id: number;
  key: string;
  name: string;
  credits: number | null;
  priceInCents: number;
  isFree: boolean;
  active: boolean;
  stripePriceId: string | null;
}

interface IndividualAccount {
  id: number;
  name: string;
  createdAt: Date | string;
  subscription: {
    status: string;
    plan: string;
    planId: number | null;
    creditsRemaining: number | null;
    trialEndsAt: Date | string | null;
    currentPeriodEnd: Date | string | null;
    planRef: Plan | null;
  } | null;
  users: { id: number; fullName: string; email: string; createdAt: Date | string }[];
}

interface VipCode {
  id: number;
  code: string;
  note: string | null;
  usedAt: Date | string | null;
  createdAt: Date | string;
  usedBy: { fullName: string; email: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  TRIAL: 'bg-primary/10 text-primary border-black/5 dark:border-white/[0.02]',
  PENDING_PAYMENT: 'bg-cyan-500/10 text-cyan-500 border-black/5 dark:border-white/[0.02]',
  ACTIVE: 'bg-green-500/10 text-green-500 border-black/5 dark:border-white/[0.02]',
  PAST_DUE: 'bg-amber-500/10 text-amber-500 border-black/5 dark:border-white/[0.02]',
  CANCELED: 'bg-red-500/10 text-red-500 border-black/5 dark:border-white/[0.02]',
};

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Teste Grátis',
  PENDING_PAYMENT: 'Acesso Provisório',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento Pendente',
  CANCELED: 'Cancelada',
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function AccountRow({ account, plans, onStatusChange, onDeleteClick }: { account: IndividualAccount, plans: Plan[], onStatusChange: () => void, onDeleteClick: () => void }) {
  const [saving, setSaving] = useState(false);
  const professor = account.users[0];
  const status = account.subscription?.status || 'TRIAL';
  const isVip = account.subscription?.plan === 'INDIVIDUAL_VIP';
  const assignablePlans = plans.filter(p => !p.isFree);

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    try {
      await updateSubscriptionStatusAction(account.id, newStatus as any);
      onStatusChange();
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanChange(planId: string) {
    if (!planId) return;
    setSaving(true);
    try {
      await assignPlanToAccountAction(account.id, Number(planId));
      onStatusChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleGrantVip() {
    setSaving(true);
    try {
      await grantVipAction(account.id);
      onStatusChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="group hover:bg-[#343536]/40 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/10 to-primary/5 flex items-center justify-center border border-black/5 dark:border-white/[0.02] shadow-inner shrink-0">
            <span className="material-symbols-outlined text-2xl text-primary">person</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-subtitle flex items-center gap-2">
              <span className="truncate">{professor?.fullName || account.name}</span>
              {isVip && (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase rounded-full border border-amber-500/20 shrink-0">VIP</span>
              )}
            </p>
            <p className="text-body text-gray-500 truncate">{professor?.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <p className="text-body text-on-surface-variant">{account.subscription?.planRef?.name || 'Sem plano'}</p>
        <p className="text-body text-gray-500">
          {account.subscription?.creditsRemaining === null ? 'Ilimitado' : `${account.subscription?.creditsRemaining ?? 0} créditos`}
        </p>
      </td>
      <td className="px-4 py-4">
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status] || status}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={status}
            disabled={saving}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[#0d0e0f]/50 border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="TRIAL">Teste Grátis</option>
            <option value="PENDING_PAYMENT">Acesso Provisório</option>
            <option value="ACTIVE">Ativa</option>
            <option value="PAST_DUE">Pagamento Pendente</option>
            <option value="CANCELED">Cancelada</option>
          </select>

          <select
            value={isVip ? '' : (account.subscription?.planId ?? '')}
            disabled={saving}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="bg-[#0d0e0f]/50 border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Trocar plano...</option>
            {assignablePlans.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.credits} créditos)</option>
            ))}
          </select>

          {!isVip && (
            <button
              onClick={handleGrantVip}
              disabled={saving}
              title="Conceder acesso VIP gratuito sem precisar de código"
              className="p-2 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-500 transition-all active:scale-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </button>
          )}

          <button
            onClick={onDeleteClick}
            disabled={saving}
            title="Excluir professor"
            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all active:scale-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function DeleteProfessorModal({ account, professorName, onClose, onSuccess }: { account: IndividualAccount, professorName: string, onClose: () => void, onSuccess: () => void }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await adminDeleteProfessorAction(account.id, confirmName);
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Erro ao excluir.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="liquid-glass w-full max-w-xl p-10 rounded-[2.5rem] border border-red-500/30 shadow-2xl relative animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-red-500">Excluir Professor</h2>
            <p className="text-gray-500 mt-2 italic">Apaga a conta, assinatura, provas, questões e correções deste professor. Não pode ser desfeito.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-red-500/5 border border-outline-variant text-on-surface leading-relaxed">
            Para confirmar, digite o nome exato do professor abaixo:
            <br />
            <strong className="text-red-400 select-none">{professorName}</strong>
          </div>

          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Digite o nome aqui..."
            className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-2xl p-4 outline-none focus:border-red-500 transition-all text-on-surface"
          />

          {error && <div className="p-4 rounded-xl bg-red-500/5 border border-outline-variant text-red-500 text-sm">{error}</div>}

          <div className="pt-4 flex gap-4">
            <button onClick={onClose} className="flex-1 p-4 rounded-2xl border border-outline-variant hover:bg-white/5 font-bold transition-all">
              Cancelar
            </button>
            <button
              disabled={confirmName.trim().toLowerCase() !== professorName.trim().toLowerCase() || loading}
              onClick={handleDelete}
              className="flex-[2] bg-red-500 text-white font-bold p-4 rounded-2xl hover:bg-red-600 disabled:opacity-20 disabled:grayscale transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanRow({ plan, onSaved }: { plan: Plan, onSaved: () => void }) {
  const [credits, setCredits] = useState(String(plan.credits ?? ''));
  const [price, setPrice] = useState((plan.priceInCents / 100).toFixed(2));
  const [stripePriceId, setStripePriceId] = useState(plan.stripePriceId ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePlanAction(plan.id, {
        credits: plan.isFree ? null : (Number(credits) || 0),
        priceInCents: Math.round(Number(price.replace(',', '.')) * 100),
        stripePriceId: stripePriceId.trim() || null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setSaving(true);
    try {
      await updatePlanAction(plan.id, { active: !plan.active });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-outline-variant flex-wrap">
      <div className="flex items-center gap-3">
        <span className="font-bold text-on-surface w-20">{plan.name}</span>
        {!plan.active && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-full">Inativo</span>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {!plan.isFree && (
          <>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Créditos</label>
              <input
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-20 bg-[#0d0e0f]/50 border border-outline-variant rounded-lg px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Preço R$</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-24 bg-[#0d0e0f]/50 border border-outline-variant rounded-lg px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-gray-500 uppercase font-bold">Stripe Price ID</label>
              <input
                value={stripePriceId}
                onChange={(e) => setStripePriceId(e.target.value)}
                placeholder="price_..."
                className="w-40 bg-[#0d0e0f]/50 border border-outline-variant rounded-lg px-2 py-1.5 text-sm text-on-surface outline-none focus:border-primary font-mono"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              Salvar
            </button>
          </>
        )}
        <button
          onClick={handleToggleActive}
          disabled={saving}
          className="px-3 py-1.5 bg-white/5 border border-outline-variant rounded-lg text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {plan.active ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    </div>
  );
}

function PlansSection({ plans, onChange }: { plans: Plan[], onChange: () => void }) {
  return (
    <section className="liquid-glass rounded-[2.5rem] p-8 border border-outline-variant shadow-2xl space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">payments</span>
          Planos
        </h3>
        <p className="text-gray-500 text-sm mt-1">Preço e créditos mensais dos planos de professor independente.</p>
      </div>

      <div className="space-y-3">
        {plans.map(p => (
          <PlanRow key={p.id} plan={p} onSaved={onChange} />
        ))}
      </div>
    </section>
  );
}

function VipCodesSection() {
  const [codes, setCodes] = useState<VipCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function loadCodes() {
    setLoading(true);
    try {
      const data = await getVipCodes();
      setCodes(data as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCodes();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateVipCodeAction(note.trim() || undefined);
      setNote('');
      await loadCodes();
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(id: number, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <section className="liquid-glass rounded-[2.5rem] p-8 border border-outline-variant shadow-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">redeem</span>
            Códigos VIP
          </h3>
          <p className="text-gray-500 text-sm mt-1">Convide professores para usar a plataforma gratuitamente via código.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observação (opcional, ex: nome do professor)"
            className="bg-[#0d0e0f]/50 border border-outline-variant rounded-xl px-4 py-2 text-sm text-on-surface outline-none focus:border-primary w-64"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl text-xs font-black hover:scale-105 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {generating ? 'Gerando...' : 'Gerar Código'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><span className="animate-spin material-symbols-outlined text-primary text-2xl">sync</span></div>
      ) : codes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Nenhum código gerado ainda.</p>
      ) : (
        <div className="space-y-3">
          {codes.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-outline-variant flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopy(c.id, c.code)}
                  title="Copiar código"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-outline-variant font-mono text-sm text-primary hover:border-primary transition-all"
                >
                  {c.code}
                  <span className="material-symbols-outlined text-sm">{copiedId === c.id ? 'check' : 'content_copy'}</span>
                </button>
                {c.note && <span className="text-xs text-gray-500 italic">{c.note}</span>}
              </div>

              {c.usedBy ? (
                <span className="px-3 py-1 bg-gray-500/10 text-gray-400 text-[10px] font-black uppercase rounded-full border border-outline-variant">
                  Usado por {c.usedBy.fullName}
                </span>
              ) : (
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase rounded-full border border-outline-variant">
                  Disponível
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfessorsSection({ plans }: { plans: Plan[] }) {
  const [accounts, setAccounts] = useState<IndividualAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState<IndividualAccount | null>(null);

  async function loadAccounts(page: number, searchTerm: string) {
    setLoading(true);
    try {
      const data = await getIndividualAccounts(page, searchTerm);
      setAccounts(data.accounts as any);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Busca com debounce; roda imediatamente na primeira montagem (search vazio).
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAccounts(1, search);
    }, search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <section className="liquid-glass rounded-[2.5rem] p-8 border border-outline-variant shadow-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">group</span>
            Professores
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {total} professor{total === 1 ? '' : 'es'} independente{total === 1 ? '' : 's'} cadastrado{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full bg-[#0d0e0f]/50 border border-outline-variant rounded-xl pl-11 pr-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
      ) : accounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table-admin w-full text-left">
            <thead>
              <tr>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Professor</th>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Plano</th>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {accounts.map(account => (
                <AccountRow
                  key={account.id}
                  account={account}
                  plans={plans}
                  onStatusChange={() => loadAccounts(currentPage, search)}
                  onDeleteClick={() => setDeletingAccount(account)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-700 mb-3 block">person_off</span>
          <p className="text-gray-500">{search ? 'Nenhum professor encontrado.' : 'Nenhum professor independente cadastrado ainda.'}</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => loadAccounts(page, search)} />

      {deletingAccount && (
        <DeleteProfessorModal
          account={deletingAccount}
          professorName={deletingAccount.users[0]?.fullName || deletingAccount.name}
          onClose={() => setDeletingAccount(null)}
          onSuccess={() => loadAccounts(currentPage, search)}
        />
      )}
    </section>
  );
}

export default function AccountsClient({ initialUserName }: { initialUserName?: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const plansData = await getPlans();
      setPlans(plansData as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-[#121315] min-h-screen text-on-surface font-['Inter'] relative overflow-hidden">
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />

      <Sidebar role="ADMIN" />
      <TopBar userName={initialUserName || "Administrador"} roleLabel="Administrador Global" />

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1700px] mx-auto space-y-10">

          <section className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-on-surface">Professores Independentes</h2>
            <p className="text-on-surface-variant text-lg max-w-3xl leading-relaxed text-gray-400">
              Gerencie as contas e assinaturas de professores que contratam o Profacher individualmente, sem vínculo com uma instituição.
            </p>
          </section>

          {!loading && plans.length > 0 && <PlansSection plans={plans} onChange={loadData} />}

          <VipCodesSection />

          <ProfessorsSection plans={plans} />

        </div>
      </main>
    </div>
  );
}
