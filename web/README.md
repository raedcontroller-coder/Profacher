# 💎 Profacher 2.0 — Real-Time Exam System

> Plataforma de alta performance para gestão e monitoramento de exames em tempo real, focada em estabilidade, resiliência e controle absoluto do docente.

![Design Status](https://img.shields.io/badge/Design-Liquid_Glass_V3-9b4dff?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js_15_|_Prisma_|_Soketi-000000?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Estável-green?style=for-the-badge)

---

## 🚀 Funcionalidades Chave

### 🛰️ Monitoramento de Presença Ininterrupto
O painel do professor oferece uma visão panorâmica e resiliente da sala de prova.
- **Status Triplo:** Identificação visual imediata de alunos `Online` (verde pulsante), `Offline` (vermelho) e `Finalizado` (azul com selo de verificação).
- **Sincronização Híbrida:** Combinação de eventos WebSocket (Presença) com polling persistente no banco de dados a cada 10 segundos, garantindo precisão mesmo em casos de latência.

### 🛡️ Protocolo de Resiliência e Recuperação
Desenvolvido para que imprevistos técnicos (queda de energia ou internet) não prejudiquem o aluno.
- **Session Recovery:** O aluno pode fechar o navegador ou trocar de dispositivo e, ao entrar com o mesmo RA, retorna exatamente ao ponto onde parou.
- **Restauração Automática:** O sistema recupera todas as respostas parciais salvas no banco de dados e preenche o gabarito do aluno instantaneamente ao reconectar.
- **Bypass de Sala de Espera:** Se a prova já estiver iniciada, o aluno reconectado pula a sala de espera e vai direto para as questões.

### 🚪 Sistema de Moderação e Expulsão
Controle total do professor sobre a entrada e permanência na sala.
- **Kick em Tempo Real:** Botão de expulsão no monitor que encerra a prova do aluno imediatamente via sinal de Socket.
- **Bloqueio de Reentrada:** Alunos expulsos são permanentemente impedidos de acessar a prova novamente através do mesmo RA.
- **Preservação de Evidências:** Respostas enviadas antes da expulsão são mantidas no banco de dados para fins de auditoria docente.

---

## 🎨 Design System: Liquid Glass V3
A interface do Profacher 2.0 segue os princípios de design moderno de alta fidelidade:
- **Estética Dark-Glass:** Vidro fosco sobre fundo ultra-escuro (`#121315`).
- **Micro-interações:** Feedback visual em botões de V/F e salvamento automático.
- **Tokens de Transparência:** Uso consistente de `white/5` para bordas e superfícies premium.

---

## 🛠️ Stack Tecnológica
- **Frontend:** React 19 / Next.js 15 (App Router)
- **Styling:** CSS Moderno / Tailwind CSS
- **Backend:** Next.js Server Actions
- **Database:** PostgreSQL com **Prisma ORM**
- **Real-time:** Soketi / Pusher Protocol

---

## ⚙️ Configuração e Execução

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o banco de dados e ambiente:**
   Crie um arquivo `.env` seguindo o modelo (não incluso no git).

3. **Sincronize o banco:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## ⚖️ Regras de Negócio Importantes
- **RA Único:** O RA do aluno é a chave primária de identificação na prova; nomes podem ser repetidos, RAs não.
- **Normalização:** Todos os nomes de alunos são convertidos para **CAIXA ALTA** no momento da entrada para garantir consistência nos relatórios.
- **Finalização Imutável:** Uma vez que o botão "Finalizar Prova" é clicado, o aluno perde o direito de edição e reentrada na sessão.

---
*Profacher 2.0 — Desenvolvido para simplificar a vida do professor e garantir a integridade do conhecimento.*
*ssh vps-profacher --Raedr93D