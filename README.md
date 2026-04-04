# Profacher 2.0 (Sistema de Provas com IA)

O **Profacher** é um inovador e robusto ecossistema de exames e avaliações que conecta Instituições, Professores e Alunos. A plataforma permite a criação, aplicação e gestão de provas com suporte de Inteligência Artificial para auxílio na correção automática e feedbacks precisos.

Criado em uma arquitetura *Multi-Tenancy* (múltiplas instituições), o Profacher fornece controle de uso, infraestrutura sólida e escalável para escolas e coordenadores, além de extrema flexibilidade aos professores para avaliarem seus alunos em um ambiente focado e seguro.

## 🌟 Visão Geral

- **Instituições e Coordenação:** Podem administrar os acessos de seus professores, acompanhar o desempenho geral dos alunos a partir das provas criadas e monitorar de perto o consumo e o uso da inteligência artificial localmente (inclusive com chaves de API próprias).
- **Professores:** Podem cadastrar bancos de questões ricos e formular provas completas contendo variados tipos (alternativa, dissertativa, matemática).
- **Alunos:** Acessam as provas através de códigos simples de entrada, preenchendo as questões em uma interface *clean* de distração mínima.
- **Correção Inteligente:** Um sistema assistente de IA sugere notas e cria feedbacks que auxiliam enormemente os professores durante as correções.

## 👥 Perfis de Acesso (Personas)

O sistema opera com 4 níveis hierárquicos:

1. **Global Admin (Gerenciamento Macro):** Adiciona instituições corporativas, monitora o acesso a nível global, supervisiona uso da IA e realiza atendimentos macro de suporte no sistema.
2. **Instituição / Coordenador (Gestão Local):** Possui métricas sobre exames, resultados e controle de gastos com os professores locais, adicionando suas próprias configurações e usuários de sua unidade/escola.
3. **Professor (Operacional):** Monta sua prova individual utilizando ferramentas de criação poderosas, englobando cálculos de pontuação, limite de tempo de prova e acompanhamento em tempo real (*ao vivo*) das entregas da turma.
4. **Aluno (Realização):** Acessa a experiência de exame, faz a prova com facilidade de navegação e produtividade, e pode ver resultados caso imediatamente caso o professor os disponibilize.

## 🛠 Stack Tecnológico

A estrutura é baseada em tecnologias modernas de alta produtividade e performance:

* **Framework Principal:** Next.js 15 (App Router / Server Components)
* **Estilização:** Tailwind CSS (Custom Implementation / Liquid Glass)
* **Banco de Dados & Infra:** PostgreSQL (Dockerizado via Coolify / Gerenciamento via DBeaver)
* **Infraestrutura:** Docker (Multi-stage Builds para máxima performance)
* **Inteligência Artificial:** OpenAI (GPT-4o-mini / GPT-4o) para análises corretivas.
* **Versão Aluno (Ambiente Focado):** Electron.
* **Editor de Conteúdo Rich Text:** React Quill (permitindo imagens e textos formatados).
* **Fórmulas e Matemática:** KaTeX / MathJax.

## 🎨 Apresentação e UX/UI (Google Stitch UI / Liquid Glass)

O projeto baseia-se num rigoroso requisito de qualidade estética. Em vez de interfaces genéricas acadêmicas, o sistema baseia-se em conceitos visuais de vanguarda inspirados por ferramentas como Linear.app e Notion:

* **Estética de Alta Fidelidade:** Designs fluidos num estilo apelidado de *Liquid Glass* (focando em elementos vítreos e translúcidos, harmonizados organicamente).
* **Dark / Light Modes:** Modos projetados de maneira elegante voltados ao conforto sem abrir mão de serem _premium_ acadêmicos.
* **Micro-interações:** Toda ação importante como salvar, publicar e visualizar o raio-x da prova têm animações sensíveis que trazem "vida" à interface, mantendo clareza de foco para usuários.
