'use client'

import React, { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import Link from 'next/link';
import { getPhysicalExamData, processPhysicalCorrection } from './actions';

export default function PhysicalCorrectionClient({ examId, userName }: { examId: number, userName: string }) {
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    async function loadExam() {
      const res = await getPhysicalExamData(examId);
      if (res.success) {
        setExam(res.exam);
      } else {
        alert(res.error);
      }
      setLoading(false);
    }
    loadExam();
  }, [examId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartCorrection = async () => {
    if (files.length === 0) {
      alert("Anexe ao menos uma foto da prova do aluno para corrigir.");
      return;
    }

    setIsCorrecting(true);
    setReport(null);

    try {
      const imageUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          imageUrls.push(data.url);
        } else {
          throw new Error(data.error || "Erro no upload da imagem");
        }
      }

      const correctionRes = await processPhysicalCorrection(examId, imageUrls);
      
      if (correctionRes.success) {
        setReport(correctionRes.result);
        setFiles([]); // Limpa as fotos após corrigir
        // Atualiza a lista de submissões localmente se precisar
        const updatedExamData = await getPhysicalExamData(examId);
        if (updatedExamData.success) {
           setExam(updatedExamData.exam);
        }
      } else {
        alert("Erro na correção: " + correctionRes.error);
      }
    } catch (e: any) {
      alert(e.message || "Erro desconhecido durante a correção.");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-500">Prova não encontrada ou não é física.</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-on-surface font-['Inter'] relative overflow-hidden transition-colors duration-300">
      <div 
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-0 dark:opacity-20"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="layout-main pt-16 min-h-screen relative z-10 print:pt-0 print:bg-white print:text-black">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1400px] mx-auto space-y-8">
          
          <header className="flex items-center justify-between print:hidden">
            <div className="space-y-1">
              <Link href="/professor/exams" className="text-orange-500 hover:underline flex items-center gap-2 mb-2 text-sm font-bold">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Voltar
              </Link>
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-orange-500 text-4xl">fact_check</span>
                Correção de Prova
              </h2>
              <p className="text-gray-400">Correção assistida por IA para: <strong className="text-white">{exam.title}</strong></p>
            </div>
            
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Submissões</p>
                <p className="text-3xl font-black">{exam.submissions?.length || 0}</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
            
            {/* Coluna da Esquerda: Upload */}
            <div className="space-y-6 print:hidden">
              <section className="liquid-glass p-8 rounded-3xl border border-outline-variant space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500">add_a_photo</span>
                    Prova do Aluno
                  </h3>
                  <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-sm font-bold">{files.length} folha(s)</span>
                </div>
                <p className="text-sm text-gray-400">Faça o upload ou tire fotos da prova do aluno. A IA lerá o nome, RA e corrigirá as questões com base no gabarito oficial.</p>

                <div className="grid grid-cols-2 gap-4">
                  {files.map((file, i) => (
                    <div key={i} className="relative aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="Preview" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <span className="material-symbols-outlined text-4xl text-gray-500">description</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removeFile(i)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/20 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-orange-500 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">add</span>
                    </div>
                    <span className="font-bold text-sm">+ Adicionar folhas</span>
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>

                <button 
                  onClick={handleStartCorrection}
                  disabled={isCorrecting || files.length === 0}
                  className="w-full mt-6 flex items-center justify-center gap-3 bg-orange-500 text-white font-black px-6 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isCorrecting ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      Analisando prova...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                      COMEÇAR A CORRIGIR
                    </>
                  )}
                </button>
              </section>
            </div>

            {/* Coluna da Direita: Relatório */}
            <div className="space-y-6">
              {report ? (
                <section className="liquid-glass p-8 rounded-3xl border border-outline-variant space-y-6 print:border-black print:text-black print:bg-white print:p-0">
                  <div className="flex items-center justify-between print:hidden">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500">task_alt</span>
                      Relatório de Correção
                    </h3>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                      <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                      Baixar PDF
                    </button>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-center justify-between print:border-gray-300">
                    <div>
                      <p className="text-sm text-primary font-bold uppercase tracking-widest mb-1">Aluno Identificado</p>
                      <h4 className="text-2xl font-black">{report.studentName}</h4>
                      <p className="text-gray-400">RA/Matrícula: {report.studentRa}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary font-bold uppercase tracking-widest mb-1">Nota Final</p>
                      <h4 className="text-4xl font-black text-primary">{report.score} <span className="text-xl text-gray-500">/ {exam.totalScore}</span></h4>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {report.details?.map((detail: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl border border-white/5 bg-white/5 space-y-4 print:border-gray-200">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-lg">Questão {detail.questionNumber || idx + 1}</h5>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${detail.pointsObtained === detail.maxPoints ? 'bg-green-500/20 text-green-500' : detail.pointsObtained > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}`}>
                            {detail.pointsObtained} / {detail.maxPoints} pts
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Resposta do Aluno</p>
                            <p className="text-sm bg-black/20 p-3 rounded-xl border border-white/5 italic">{detail.studentAnswer}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Gabarito Esperado</p>
                            <p className="text-sm bg-black/20 p-3 rounded-xl border border-white/5 text-green-400/80">{detail.correctAnswer}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Feedback da IA</p>
                          <p className="text-sm">{detail.feedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl print:hidden">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-gray-600">assignment_turned_in</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Aguardando Correção</h3>
                  <p className="text-gray-500 max-w-sm">Adicione as folhas da prova do aluno e inicie a correção para ver o relatório aqui.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
