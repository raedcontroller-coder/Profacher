'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LogoProfacher from '@/components/shared/LogoProfacher';

interface Plan {
  id: number;
  key: string;
  name: string;
  credits: number | null;
  priceInCents: number;
}

const PLAN_HIGHLIGHT: Record<string, string> = {
  TURBO: 'RECOMENDADO',
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full border border-black/5 dark:border-white/[0.02] text-primary text-xs font-bold uppercase tracking-widest">
      {children}
    </span>
  );
}

function PainCard({ icon, title, children, delay }: { icon: string, title: string, children: React.ReactNode, delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="liquid-glass rounded-3xl p-7 h-full border border-white/5 hover:border-primary/30 transition-colors">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
        </div>
        <h3 className="font-bold text-lg text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
      </div>
    </Reveal>
  );
}

function AudienceCard({ icon, badge, title, description, bullets, delay }: { icon: string, badge: string, title: string, description: string, bullets: string[], delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="liquid-glass rounded-[2rem] p-8 h-full flex flex-col border border-white/5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(192,193,255,0.25)]">
          <span className="material-symbols-outlined text-on-primary-container">{icon}</span>
        </div>
        <span className="text-xs font-black uppercase tracking-widest text-primary mb-2">{badge}</span>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{description}</p>
        <ul className="space-y-3 mt-auto">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">check_circle</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

function CorrectionCard({ icon, title, children, delay }: { icon: string, title: string, children: React.ReactNode, delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="liquid-glass rounded-2xl p-6 h-full border border-white/5">
        <span className="material-symbols-outlined text-primary text-2xl mb-3 block">{icon}</span>
        <h4 className="font-bold text-white mb-1.5">{title}</h4>
        <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
      </div>
    </Reveal>
  );
}

function DifferentialCard({ icon, title, children, delay, legend }: { icon: string, title: string, children: React.ReactNode, delay: number, legend?: React.ReactNode }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="liquid-glass rounded-3xl p-7 h-full border border-white/5 flex gap-4">
        <span className="material-symbols-outlined text-primary text-3xl shrink-0">{icon}</span>
        <div>
          <h4 className="font-bold text-white mb-1.5">{title}</h4>
          <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
          {legend}
        </div>
      </div>
    </Reveal>
  );
}

export default function HomeClient({ plans }: { plans: Plan[] }) {
  return (
    <div className="min-h-screen bg-[#121315] text-on-surface font-['Inter'] relative overflow-x-hidden">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[8%] w-[35%] h-[40%] bg-primary/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] right-[8%] w-[30%] h-[35%] bg-primary-container/10 rounded-full blur-[130px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#121315]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoProfacher className="w-9 h-9 text-primary" hoverBlink />
            <span className="text-lg font-bold tracking-tight text-white">Profacher</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          </nav>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <Reveal>
            <SectionEyebrow>Inteligência Artificial para Educação</SectionEyebrow>
            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[1.05]">
              A revolução na avaliação educacional com{' '}
              <span className="text-primary">Inteligência Artificial</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-lg">
              Transforme a maneira como sua instituição aplica e corrige provas de múltipla escolha, dissertações,
              exatas e provas físicas, com precisão, velocidade e inteligência.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/register-professor" className="btn-primary flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span>
                Sou Professor
              </Link>
              <Link href="/login" className="btn-secondary flex items-center gap-2">
                Acessar o Sistema
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={150} className="flex justify-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px] animate-glow-pulse" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/blink.jpg"
                alt="Profacher"
                className="relative w-full h-full object-contain rotate-[30deg]"
                style={{ mixBlendMode: 'screen' }}
              />
            </div>
          </Reveal>
        </section>

        {/* Dores / Benefícios */}
        <section id="beneficios" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-14">
            <SectionEyebrow>Por que Profacher</SectionEyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tight">
              Os desafios que o Profacher elimina
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              Instituições de ensino enfrentam desafios que consomem tempo, recursos e comprometem a qualidade da
              avaliação. O Profacher elimina essas barreiras com tecnologia de ponta.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <PainCard icon="schedule" title="Sobrecarga dos Professores" delay={0}>
              Dezenas de horas mensais corrigindo provas manualmente. O Profacher reduz a correção para segundos.
            </PainCard>
            <PainCard icon="balance" title="Subjetividade e Erros" delay={60}>
              O cansaço humano gera injustiças. A IA analisa o desenvolvimento do aluno de forma neutra e precisa.
            </PainCard>
            <PainCard icon="description" title="Logística e Papel" delay={120}>
              Impressão, distribuição e armazenamento físico geram altos custos e impacto ambiental.
            </PainCard>
            <PainCard icon="monitoring" title="Dados em Tempo Real" delay={180}>
              Com provas tradicionais, resultados levam semanas. Com o Profacher, a gestão é ao vivo.
            </PainCard>
            <PainCard icon="key" title="Acesso Simplificado" delay={240}>
              Sem senhas complexas. O aluno acessa com nome, RA e código da prova. Sem burocracia.
            </PainCard>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-14">
            <SectionEyebrow>Como funciona</SectionEyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tight">
              Uma plataforma, três experiências
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              Do painel gerencial da instituição à correção automática do professor, até o feedback instantâneo do
              aluno, tudo conectado.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AudienceCard
              icon="apartment"
              badge="Para Instituições"
              title="Controle total da operação"
              description="Visibilidade completa da operação de avaliações em um único painel gerencial."
              bullets={[
                'Gerencie todos os professores',
                'Acompanhe o rendimento das turmas em tempo real',
                'Controle custos operacionais',
              ]}
              delay={0}
            />
            <AudienceCard
              icon="auto_awesome"
              badge="Para Professores"
              title="O mestre da operação"
              description="Crie provas em minutos, acompanhe a turma ao vivo e valide notas com um clique."
              bullets={[
                'Banco de questões com texto, imagens e fórmulas',
                'Correção por IA em segundos, com validação final sua',
                'Veja ao vivo quem está online e quem já terminou',
              ]}
              delay={100}
            />
            <AudienceCard
              icon="school"
              badge="Para Alunos"
              title="Experiência sem complicações"
              description="Acesso simples e feedback instantâneo, sem burocracia."
              bullets={[
                'Entra com Nome, RA e Código da Prova',
                'Sala de espera até o professor liberar',
                'Feedback didático mostrando onde acertou ou errou',
              ]}
              delay={200}
            />
          </div>
        </section>

        {/* Correção Inteligente e Híbrida */}
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-14">
            <SectionEyebrow>Correção Inteligente</SectionEyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tight">
              A IA que entende cada tipo de questão
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              Não é só marcar o X certo. O Profacher lê textos, interpreta o raciocínio matemático em fotos e corrige
              provas físicas de acordo com o gabarito do professor.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <CorrectionCard icon="check_circle" title="Múltipla Escolha" delay={0}>
              Correção automática e instantânea, com precisão total.
            </CorrectionCard>
            <CorrectionCard icon="article" title="Dissertações" delay={60}>
              Analisa o desenvolvimento textual com base no gabarito oficial do professor.
            </CorrectionCard>
            <CorrectionCard icon="functions" title="Exatas" delay={120}>
              Interpreta a lógica matemática em fotos. Se o raciocínio estiver correto, a nota é garantida.
            </CorrectionCard>
            <CorrectionCard icon="photo_camera" title="Provas Físicas" delay={180}>
              Envio de fotos da prova em papel; a IA compara com o gabarito e gera a nota automaticamente.
            </CorrectionCard>
          </div>
        </section>

        {/* Principais Diferenciais */}
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-14">
            <SectionEyebrow>Diferenciais</SectionEyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tight">
              Feito para o dia a dia real da correção
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DifferentialCard
              icon="bolt"
              title="Feedback Imediato"
              delay={0}
              legend={
                <div className="flex items-center gap-4 mt-3 flex-wrap text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400" />Acerto</span>
                  <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" />Parcial</span>
                  <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400" />Erro</span>
                </div>
              }
            >
              Raio-X da prova com cores: verde (acerto), amarelo (parcial) e vermelho (erro). O aluno aprende de imediato.
            </DifferentialCard>
            <DifferentialCard icon="encrypted" title="Ambiente Antifraude" delay={80}>
              A prova só inicia simultaneamente quando o professor permite, garantindo sincronia perfeita em sala ou remotamente.
            </DifferentialCard>
            <DifferentialCard icon="diamond" title="Interface Premium" delay={160}>
              Design moderno e limpo, como uma ferramenta profissional de alta produtividade, sem curva de aprendizado complexa.
            </DifferentialCard>
            <DifferentialCard icon="monitoring" title="Dados em Tempo Real" delay={240}>
              Gestão ao vivo de alunos, notas e desempenho, sem esperar semanas pelos resultados.
            </DifferentialCard>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-14">
            <SectionEyebrow>Planos</SectionEyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-white tracking-tight">
              Para professores independentes e instituições
            </h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              Sem instituição? Comece sozinho, no seu ritmo, com créditos para corrigir provas por IA.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const highlight = PLAN_HIGHLIGHT[plan.key];
              return (
                <Reveal key={plan.id} delay={i * 80} className="h-full">
                  <div className={`liquid-glass rounded-[2rem] p-8 h-full flex flex-col border shadow-2xl relative ${highlight ? 'border-primary' : 'border-white/10'}`}>
                    {highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-black text-[10px] font-black uppercase rounded-full">
                        {highlight}
                      </span>
                    )}
                    <h3 className="text-2xl font-black text-white mb-1">{plan.name}</h3>
                    <p className="text-gray-500 text-sm mb-6">{plan.credits} créditos por mês</p>
                    <div className="mb-8">
                      <span className="text-3xl font-black text-white">{formatPrice(plan.priceInCents)}</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <Link
                      href="/register-professor"
                      className={`mt-auto w-full text-center py-3.5 rounded-xl font-bold transition-all ${highlight ? 'bg-primary text-black hover:scale-[1.02]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
                    >
                      Começar agora
                    </Link>
                  </div>
                </Reveal>
              );
            })}

            <Reveal delay={plans.length * 80} className="h-full">
              <div className="liquid-glass rounded-[2rem] p-8 h-full flex flex-col border border-white/10 shadow-2xl">
                <h3 className="text-2xl font-black text-white mb-1">Instituição</h3>
                <p className="text-gray-500 text-sm mb-6">Escolas, faculdades e cursinhos</p>
                <div className="mb-8">
                  <span className="text-3xl font-black text-white">Sob consulta</span>
                </div>
                <a
                  href="mailto:convites@raed.world?subject=Quero%20conhecer%20o%20Profacher%20para%20minha%20institui%C3%A7%C3%A3o"
                  className="mt-auto w-full text-center py-3.5 rounded-xl font-bold transition-all bg-white/5 text-white border border-white/10 hover:bg-white/10"
                >
                  Falar com a gente
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Com o Profacher, a avaliação muda de vez.
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto leading-relaxed">
              Mais tempo para ensinar, menos tempo corrigindo, com feedback no momento exato em que o aluno mais
              precisa para aprender.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register-professor" className="btn-primary flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span>
                Sou Professor
              </Link>
              <Link href="/login" className="btn-secondary flex items-center gap-2">
                Acessar o Sistema
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
          <a
            href="https://raed.world/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 text-xs font-mono uppercase tracking-[0.3em] text-white/50 hover:text-white transition-all group"
          >
            <span>Powered by</span>
            <img
              src="/RaedLogo.svg"
              alt="Raed"
              className="h-6 brightness-0 invert opacity-50 group-hover:opacity-100 transition-opacity"
            />
          </a>
          <p className="text-xs text-gray-600">Profacher: Inteligência Artificial a serviço da educação.</p>
        </div>
      </footer>
    </div>
  );
}
