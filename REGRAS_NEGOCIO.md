# Regras de Negócio - Profacher 2.0

Este documento centraliza as regras de negócio implementadas e planejadas para o sistema.

## 1. Administração Global - Instituições
- **Cadastro**: Deve haver uma interface para o administrador global cadastrar novas instituições.
- **Edição com Dupla Confirmação**: Qualquer alteração em uma instituição exige uma segunda confirmação ("Tenho certeza, Salvar") antes de persistir os dados.
- **Exclusão Segura**: A exclusão de uma instituição é uma operação destrutiva. O usuário deve digitar manualmente o nome exato da instituição em um modal para habilitar o botão de confirmação.

## 2. Banco de Questões
- **Organização por Grupos**: As questões devem ser organizadas em "Grupos de Questões" (Categorias) para facilitar a gestão e o reuso.
- **Propriedade**: Cada questão e grupo pertence ao professor que o criou.

## 3. Sistema de Provas (Exams)
- **Criação de Provas**: Professores podem criar provas selecionando questões do banco ou criando novas questões diretamente na tela de "Nova Prova".
- **Auto-organização de Questões**: Se o professor criar questões diretamente em uma "Nova Prova" (sem puxar do banco), ao salvar a prova, o sistema deve criar automaticamente um **Grupo de Questões** com o nome da prova e arquivar essas novas questões nele.
- **Correção Comparativa (IA)**: Para questões dissertativas e de cálculo, a IA atua apenas como um comparador inteligente. A correção deve ser baseada estritamente no **Gabarito de Referência** fornecido pelo professor, independentemente do conhecimento externo da IA. Se o professor definir um gabarito tecnicamente incorreto por engano ou propósito (ex: 1+1=3), a IA deve validar a resposta do aluno contra esse gabarito específico.

## 4. Segurança e Acesso
- **Redirecionamento por Papel**: O sistema deve redirecionar automaticamente o usuário logado para sua área específica (Admin, Coordenador ou Professor) com base em seu `role` no banco de dados.
- **Proteção de Rotas**: Cada área do sistema deve ser acessível apenas por usuários com o papel correspondente.
