'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import { getAiUsageByTeacher } from '../actions';
import { Pagination } from '@/components/shared/Pagination';

function AiCostCard({ usageData }: { usageData: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(usageData.length / ITEMS_PER_PAGE);
  const paginatedUsage = usageData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalInstitutionCost = usageData.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="col-span-12 liquid-glass rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-primary/20">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-9xl text-primary">monitoring</span>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="font-bold text-2xl text-on-surface">Custos de Inteligência Artificial</h3>
            <p className="text-gray-400 text-sm">Monitoramento de gastos em Reais (R$) por professor.</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-gray-400 text-sm uppercase tracking-wider font-bold">Custo Total da Instituição</p>
            <p className="text-3xl font-bold text-primary">
              R$ {totalInstitutionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-admin w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider">Professor</th>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Tokens Gastos</th>
                <th className="py-3 px-4 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Custo Estimado (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usageData.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">Nenhum custo registrado até o momento.</td>
                </tr>
              )}
              {paginatedUsage.map((data, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-medium text-on-surface">{data.teacherName}</td>
                  <td className="py-4 px-4 text-right text-gray-400">{data.totalTokens.toLocaleString('pt-BR')} tokens</td>
                  <td className="py-4 px-4 text-right font-bold text-green-400">R$ {data.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usageData.length > 0 && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiCostsClient({ initialUserName }: { initialUserName?: string }) {
  const { data: session, status } = useSession();
  const [usageData, setUsageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isLoadingSession = status === "loading";
  const currentUserName = initialUserName || session?.user?.name || (isLoadingSession ? "Carregando..." : "Usuário");

  useEffect(() => {
    async function loadData() {
      try {
        const usage = await getAiUsageByTeacher();
        setUsageData(usage);
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
          <section className="grid grid-cols-1 gap-8">
            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface font-['Inter']">Gestão Financeira de IA</h2>
              <p className="text-on-surface-variant text-lg max-w-3xl font-['Inter'] leading-relaxed">
                Monitore o consumo e os custos dos modelos de Inteligência Artificial pela sua instituição acadêmica.
              </p>
            </div>
          </section>

          <section className="space-y-8">
            {loading ? (
              <div className="flex justify-center py-20"><span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span></div>
            ) : (
              <AiCostCard usageData={usageData} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
