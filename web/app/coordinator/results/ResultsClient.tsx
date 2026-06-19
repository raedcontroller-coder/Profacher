'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import TopBar from '@/components/dashboard/TopBar'
import { Pagination } from '@/components/shared/Pagination'

interface ExamResult {
  id: number;
  title: string;
  teacherName: string;
  status: string;
  createdAt: Date;
  totalSubmissions: number;
  avgScore: number;
}

interface Props {
  initialResults: ExamResult[];
  userName: string;
}

export default function ResultsClient({ initialResults, userName }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // Filter
  const filteredResults = initialResults.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="min-h-screen bg-surface text-on-surface selection:bg-primary/30 selection:text-primary font-['Inter']">
      <Sidebar role="COORDENADOR" />
      <TopBar userName={userName} roleLabel="Coordenador" />

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1200px] mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter">Resultados Globais</h1>
              <p className="text-gray-500 font-medium">Acompanhe o desempenho de todas as turmas da instituição.</p>
            </div>
            
            <div className="relative w-full md:w-72 shrink-0">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                type="text"
                placeholder="Buscar por prova ou professor..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary focus:bg-white/10 transition-all outline-none"
              />
            </div>
          </header>

          <div className="liquid-glass rounded-[2.5rem] border border-outline-variant p-6 md:p-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                    <th className="py-4 px-4">Prova</th>
                    <th className="py-4 px-4">Professor</th>
                    <th className="py-4 px-4 text-center">Aplicação</th>
                    <th className="py-4 px-4 text-center">Entregas</th>
                    <th className="py-4 px-4 text-center">Média da Turma</th>
                    <th className="py-4 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center opacity-30">
                        <span className="material-symbols-outlined text-6xl block mb-4">analytics</span>
                        <p className="text-lg font-medium">Nenhum resultado encontrado.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedResults.map((exam) => (
                      <tr key={exam.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-5 px-4">
                          <p className="font-bold text-sm text-white truncate max-w-[250px]" title={exam.title}>{exam.title}</p>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                              {exam.teacherName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-300 truncate max-w-[150px]" title={exam.teacherName}>{exam.teacherName}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center text-xs text-gray-400">
                          {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-5 px-4 text-center">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-300">
                            {exam.totalSubmissions}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center">
                          <span className="text-lg font-black text-primary">
                            {exam.avgScore.toFixed(1).replace('.', ',')}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center">
                          {exam.status === 'FINISHED' ? (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-500/20">
                              CONCLUÍDA
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full border border-primary/20">
                              EM APLICAÇÃO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 border-t border-white/5 pt-6 flex justify-center">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  )
}
