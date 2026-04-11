ESPECIFICAÇÃO TÉCNICA E FUNCIONAL - PROFACHER (SISTEMA DE PROVAS COM IA)

1. VISÃO GERAL

O Profacher é um ecossistema de exames que utiliza Inteligência Artificial para correção automática de provas. O sistema é robusto, suportando múltiplos tipos de questões (alternativa, dissertativa, matemática) e agora operando em arquitetura Multi-Tenancy (Múltiplas Instituições).

2. PERSONAS E PERMISSÕES

A. GLOBAL ADMIN (O Dono do Sistema)





Objetivo: Gestão macro do negócio Profacher.



Funcionalidades: 





Visualizar volume total de provas e IA em todo o sistema.



Criar e gerenciar novas Instituições (Ex: FECAP, SENAI).



Criar e editar Coordenadores de cada instituição.



Acesso irrestrito a qualquer prova ou nota para suporte.

B. INSTITUIÇÃO / COORDENADOR (1 por Inst.)





Objetivo: Gestão local de qualidade e custo.



Funcionalidades:





Visualizar todos os professores de sua escola/faculdade.



Ver os resultados das provas de todos os professores locais.



Monitorar o consumo de IA (tokens/custo) por prova e professor.



Definir a chave de API da OpenAI exclusiva da instituição.

C. PROFESSOR





Objetivo: Operacionalizar exames.



Funcionalidades:





Criar Provas Individuais (Rascunho -> Publicada -> Ativa -> Finalizada).



Editor de Questões (Suporte a Texto Rico, Imagens e Fórmulas Matemáticas/LaTeX).



Definir pesos de questões, tempo de prova e sorteio aleatório.



Monitorar o andamento da prova em tempo real (quem já entrou, quem já entregou).



Ver notas sugeridas pela IA e feedbacks detalhados por aluno.

D. ALUNO





Objetivo: Realizar exames com menor custo de logística e correção instantânea.



Funcionalidades:





Entrada via "Código de Prova" (ex: AB123).



Interface focada em produtividade (distração mínima).



Ver resultados imediatos (se habilitado pelo professor).

3. ESPECIFICAÇÃO DAS TELAS (UX/UI)

TELA 1: LOGIN E AUTH





Entrada via Email/Senha com recuperação.



Design limpo, focado em segurança.

TELA 2: DASHBOARD (LISTAGEM DE PROVAS)





View principal do professor.



Filtros por Instituição (para admin).



Cards de Provas dinâmicos com contagem de alunos online.



Resumo de consumo de IA visível para coordenadores/admin.

TELA 3: CRIADOR DE PROVA (BUILDER)





Split screen ou modal largo.



Lista de questões lateral.



Editor central com botões para questões Alternativas, Dissertativas e Matemáticas.



Configurações de nota total com barra de progresso de peso automático.

TELA 4: CENTRAL DE RESULTADOS (MODO AO VIVO)





Tabela moderna com status (Fazendo / Concluído).



Clique na linha do aluno abre o "Raio-X" da prova dele.



Visualização de feedback da IA com cores (Verde: Acerto, Amarelo: Parcial, Vermelho: Erro).

TELA 5: GERENCIAMENTO DE USUÁRIOS (SÓ ADMIN/COORD)





Tabela de cargos (Role).



Formulário de convite/criação rápida de professor.



Seletor de Instituição vinculado ao perfil.

4. STACK TÉCNICA (PARA REFERÊNCIA)





Frontend: React + Vite + Vanilla CSS.



Backend: Supabase (PostgreSQL + Auth + Realtime).



IA: OpenAI GPT-4o-mini / GPT-4o.



Interface Aluno Desktop: Electron.



Matemática: KaTeX / MathJax.



Editor: React Quill (Texto Rico).

5. REQUISITOS ESTÉTICOS (GOOGLE STITCH UI)





O sistema deve parecer uma ferramenta de produtividade moderna (estilo Linear.app ou Notion).



Uso de Dark Mode elegante ou Light Mode acadêmico de alto padrão.



Micro-interações em botões de "Ativar Prova" e "Salvar".



Visualização clara de hierarquia (Admin vs Coord vs Prof).



Liquid Glass style


uero que na pagina do professor Minhas Provas tenha um botao na prova "Iniciar prova"
e quue a prova contenha um codigo
exe. "FD42G"

-devemos criar uma pagina para o aluno
-o aluno nao vai precisar criar login
-o aluno deve inserir nome completo, RA, e codigo da prova
-ao inserir esses dados, ele deve ser levado para uma wating room. aguardando o professor a clicar no iniciar prova
-quando o professor clicar, deve iniciar para todos os alunos conectado a essa prova

-devemos preparar o banco e garantir que o websocket funcione e dispare para todos os alunos