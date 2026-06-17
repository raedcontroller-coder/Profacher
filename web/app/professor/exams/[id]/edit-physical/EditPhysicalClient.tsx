'use client'

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import Link from 'next/link';
import { updatePhysicalExam } from './actions';

interface InitialData {
  title: string;
  description: string;
  aiInstructions: string;
  totalScore: number;
  answerKeyImages: string[];
}

export default function EditPhysicalClient({ userName, examId, initialData }: { userName: string; examId: number; initialData: InitialData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [aiInstructions, setAiInstructions] = useState(initialData.aiInstructions);
  const [totalScore, setTotalScore] = useState<number>(initialData.totalScore);
  
  const [existingImages, setExistingImages] = useState<string[]>(initialData.answerKeyImages);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title) {
      alert("Por favor, insira o título da prova.");
      return;
    }
    if (existingImages.length === 0 && newFiles.length === 0) {
      alert("Por favor, anexe ao menos uma foto do gabarito.");
      return;
    }

    setIsSaving(true);
    setIsUploading(true);

    try {
      const finalImageUrls: string[] = [...existingImages];

      for (const file of newFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          finalImageUrls.push(data.url);
        } else {
          throw new Error(data.error || "Erro ao fazer upload da imagem");
        }
      }

      setIsUploading(false);

      const result = await updatePhysicalExam(examId, {
        title,
        description,
        aiInstructions,
        totalScore,
        answerKeyImages: finalImageUrls,
      });

      if (result.success) {
        router.push('/professor/exams');
      } else {
        alert("Erro ao salvar: " + result.error);
        setIsSaving(false);
      }
    } catch (e: any) {
      alert(e.message || "Erro desconhecido");
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen text-on-surface font-['Inter'] relative overflow-hidden transition-colors duration-300">
      <div 
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-0 dark:opacity-20"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 dark:bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar role="PROFESSOR" />
      <TopBar userName={userName} roleLabel="Professor" />

      <main className="layout-main pt-16 min-h-screen relative z-10">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
          
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <Link href="/professor/exams" className="text-primary hover:underline flex items-center gap-2 mb-2 text-sm font-bold">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Voltar para Provas
              </Link>
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-4xl">edit_document</span>
                Editar Prova Física
              </h2>
              <p className="text-gray-400">Edite as informações e os gabaritos da prova.</p>
            </div>
            
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-black font-bold px-8 py-4 rounded-2xl hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  {isUploading ? 'Fazendo upload...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Salvar Alterações
                </>
              )}
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Informações Básicas */}
              <section className="liquid-glass p-8 rounded-3xl border border-outline-variant space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Informações Básicas
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Título da Prova</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Ex: Prova de Matemática - 1º Bimestre"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Descrição (Opcional)</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors min-h-[100px]"
                    placeholder="Detalhes sobre a prova..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Valor Total da Prova</label>
                  <input 
                    type="number" 
                    value={totalScore}
                    onChange={e => setTotalScore(Number(e.target.value))}
                    min="0"
                    step="0.5"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </section>

              {/* Instruções para a IA */}
              <section className="liquid-glass p-8 rounded-3xl border border-outline-variant space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">smart_toy</span>
                  Instruções para a IA
                </h3>
                <p className="text-sm text-gray-400">Adicione regras de correção, critérios de pontuação ou observações importantes para a inteligência artificial considerar na hora da leitura e correção.</p>
                <textarea 
                  value={aiInstructions}
                  onChange={e => setAiInstructions(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-secondary/50 transition-colors min-h-[150px]"
                  placeholder="Ex: Desconsidere erros ortográficos. Na questão 2, aceite também como certa a resposta '42'. Divida a pontuação da questão 3 em 3 partes de igual valor."
                />
              </section>
            </div>

            {/* Gabarito */}
            <div className="space-y-6">
              <section className="liquid-glass p-8 rounded-3xl border border-outline-variant space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">photo_camera</span>
                    Imagens do Gabarito
                  </h3>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">{existingImages.length + newFiles.length} folha(s)</span>
                </div>
                <p className="text-sm text-gray-400">Gerencie as imagens enviadas. Você pode excluir as antigas e adicionar novas se quiser atualizar o gabarito.</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Imagens Existentes */}
                  {existingImages.map((imgUrl, i) => (
                    <div key={`existing-${i}`} className="relative aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                      <img src={imgUrl} alt="Preview" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removeExistingImage(i)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 text-xs truncate text-orange-400 font-bold">
                        Existente {i + 1}
                      </div>
                    </div>
                  ))}

                  {/* Novas Imagens */}
                  {newFiles.map((file, i) => (
                    <div key={`new-${i}`} className="relative aspect-[3/4] bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="Preview" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <span className="material-symbols-outlined text-4xl text-gray-500">description</span>
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removeNewFile(i)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 text-xs truncate text-primary font-bold">
                        Nova Folha {i + 1}
                      </div>
                    </div>
                  ))}

                  {/* Botão de Adicionar */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                    </div>
                    <span className="font-bold text-sm text-center px-4">+ Adicionar folha</span>
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
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
