'use client';

import React, { useActionState } from 'react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <>
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#0d0e0f]">
        <img 
          src="/bg.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-70 blur-[20px] scale-110" 
        />
      </div>

      <main className="relative z-10 min-h-screen flex items-center justify-center p-6 text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-hidden">
        <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 liquid-glass rounded-[4rem] overflow-hidden gap-12">
          
          {/* Left Side: Narrative/Brand */}
          <div className="hidden lg:flex flex-col p-12 relative z-10 h-full">
            {/* Top Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <h1 className="text-xl font-bold tracking-tighter text-primary">Profacher</h1>
            </div>
            
            {/* Main Text Content: Left aligned, vertically centered and lowered */}
            <div className="flex-1 flex flex-col justify-center items-start text-left mt-20 space-y-4">
              <h2 className="text-4xl font-headline font-bold leading-tight tracking-tight">
                Onde o conhecimento <br/>
                <span className="text-primary">encontra sua melhor versão.</span>
              </h2>
              <p className="text-on-surface-variant text-lg max-w-sm leading-relaxed">
                IA como um amplificador da capacidade do professor.
              </p>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="p-8 md:p-16 flex flex-col justify-center relative z-10">
            <div className="mb-10 lg:hidden flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <span className="font-bold tracking-tighter text-primary">Profacher</span>
            </div>

            <div className="mb-10">
              <h3 className="text-2xl font-bold tracking-tight mb-2">Bem-vindo de volta</h3>
              <p className="text-on-surface-variant">Insira suas credenciais para acessar seu painel.</p>
            </div>

            <form action={formAction} className="space-y-6">
              {error && (
                <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-[0.2em] text-outline ml-1" htmlFor="email">E-mail Acadêmico</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-xl">alternate_email</span>
                  <input 
                    name="email"
                    className="w-full bg-surface-container-highest/50 border-0 rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/30 transition-all outline-none" 
                    id="email" 
                    placeholder="nome@instituicao.edu.br" 
                    type="email" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <label className="font-mono text-xs uppercase tracking-[0.2em] text-outline" htmlFor="password">Chave de Acesso</label>
                  <a className="text-xs font-medium text-primary hover:text-primary-fixed transition-colors" href="#">Esqueceu a senha?</a>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-xl">lock</span>
                  <input 
                    name="password"
                    className="w-full bg-surface-container-highest/50 border-0 rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/30 transition-all outline-none" 
                    id="password" 
                    placeholder="••••••••••••" 
                    type={showPassword ? 'text' : 'password'} 
                    required
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-1">
                <input 
                  name="remember"
                  className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" 
                  id="remember" 
                  type="checkbox" 
                />
                <label className="text-sm text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Lembrar desta sessão</label>
              </div>

              <button 
                disabled={isPending}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-semibold py-4 rounded-xl shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed" 
                type="submit"
              >
                {isPending ? 'Validando...' : 'Entrar no Profacher'}
                {!isPending && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
              </button>
            </form>

            <p className="mt-12 text-center text-sm text-on-surface-variant">
              Novo no círculo Profacher? <a className="text-primary font-semibold hover:underline underline-offset-4 decoration-primary/30" href="#">Solicitar Acesso</a>
            </p>
          </div>
        </div>

        {/* Utility Footer (Floating) */}
        <footer className="absolute bottom-10 left-0 right-0 flex justify-center">
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
        </footer>
      </main>
    </>
  );
}
