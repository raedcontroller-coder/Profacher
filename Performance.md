# Planejamento de Performance: Migração para Soketi (WebSockets)

Este documento descreve a estratégia técnica e arquitetural para a migração do serviço gerenciado (Pusher) para uma solução auto-hospedada (Soketi) no Coolify, visando suportar milhares de alunos simultâneos no **Profacher 2.0**.

## 1. O Desafio Atual (Pusher)

Atualmente, o Profacher 2.0 utiliza a infraestrutura pública do **Pusher** para gerenciar eventos em tempo real (como a entrada em Salas de Espera e gatilhos de início de provas).
O principal gargalo dessa abordagem é o **limite de conexões do plano gratuito**:
- Limite estrito de 100 conexões simultâneas.
- O 101º aluno a tentar conectar receberá um erro e não conseguirá receber eventos ao vivo.
- Planos pagos do Pusher que suportam alto volume de tráfego (ex: 10k simultâneos) podem custar centenas de dólares mensais.

## 2. A Solução: Soketi

O **Soketi** é um servidor WebSockets open-source de altíssima performance construído sobre `uWebSockets.js` (C++ por baixo do capô).
A maior vantagem arquitetural do Soketi é ser **100% compatível com a API e o protocolo do Pusher**. Isso significa que as bibliotecas padrão já instaladas (`pusher` no backend e `pusher-js` no frontend) continuarão funcionando perfeitamente sem necessidade de reescrever a lógica de eventos ou canais do Profacher.

### Benefícios Diretos
1. **Escalabilidade Ilimitada:** O limite de 100 conexões desaparece. Você fica limitado apenas aos recursos físicos da sua VPS. O Soketi consome pouquíssima RAM, permitindo milhares de conexões em um servidor de 2GB.
2. **Custo Zero Adicional:** Roda dentro do Docker no seu Coolify, compartilhando o mesmo custo fixo da VPS que já abriga o banco e a aplicação.
3. **Privacidade e Menor Latência:** Os eventos transitam localmente dentro da sua infraestrutura, garantindo latência ultra-baixa entre a emissão do evento pelo Node.js e a entrega via WebSocket.

## 3. Plano de Implantação no Coolify

Para colocar o Soketi em produção, o fluxo ideal de deploy no Coolify é:

1. **Criar Serviço Docker:** Levantar um container a partir da imagem `quay.io/soketi/soketi`.
2. **Configuração de Domínio:** Atrelar um subdomínio específico (ex: `ws.profacher.com`) com SSL gerenciado pelo Coolify (Traefik/Caddy).
3. **Variáveis de Ambiente (Soketi):** Definir credenciais locais seguras:
   - `SOKETI_DEFAULT_APP_ID=seu_app_id_secreto`
   - `SOKETI_DEFAULT_APP_KEY=sua_chave_publica`
   - `SOKETI_DEFAULT_APP_SECRET=sua_chave_privada_secreta`

## 4. Alterações no Código do Profacher

A mudança no repositório será mínima, resumindo-se praticamente ao arquivo `.env` e ao momento de instanciação do cliente Pusher.

### Configuração `.env`
Substituir as credenciais públicas pelas locais e apontar para o novo host:
```env
# Antigo
# NEXT_PUBLIC_PUSHER_KEY="..."
# PUSHER_APP_ID="..."
# PUSHER_SECRET="..."
# PUSHER_CLUSTER="sa1"

# Novo (Soketi)
NEXT_PUBLIC_PUSHER_KEY="sua_chave_publica"
PUSHER_APP_ID="seu_app_id_secreto"
PUSHER_SECRET="sua_chave_privada_secreta"
NEXT_PUBLIC_PUSHER_HOST="ws.profacher.com"
NEXT_PUBLIC_PUSHER_PORT="443"
NEXT_PUBLIC_PUSHER_SCHEME="https"
```

### Instanciação (Backend - `lib/pusher.ts`)
Forçar a biblioteca de backend a apontar para o Soketi local:
```typescript
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  host: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  port: process.env.NEXT_PUBLIC_PUSHER_PORT!,
  useTLS: true,
  // cluster é removido, pois Soketi não usa clusters por padrão
});
```

### Instanciação (Frontend - `pusher-js`)
Garantir que o lado do cliente também saiba conversar com o servidor customizado:
```typescript
const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  wsPort: process.env.NEXT_PUBLIC_PUSHER_PORT!,
  wssPort: process.env.NEXT_PUBLIC_PUSHER_PORT!,
  forceTLS: true,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
});
```

## 5. Próximos Passos (Recomendação)
1. **Teste em Staging:** Subir o Soketi no Coolify e rodar testes de carga locais simulando dezenas de conexões em provas teste.
2. **Homologação da Fila (Opcional):** Se o Soketi crescer a níveis empresariais (+50k simultâneos), ele suporta clusters Redis internamente para escalar horizontalmente. Para o escopo atual, o modo autônomo (standalone) é perfeitamente adequado.

## 6. O Pool de Conexões do Banco (Prisma + PostgreSQL) - Gargalo de Pico

O clássico problema do "Efeito Manada" (Thundering Herd): quando o professor encerra a prova, centenas de alunos enviam as respostas para o banco de dados exatamente no mesmo segundo.

**Como calcular:** O Prisma por padrão abre um número de conexões igual a `(Número de CPUs do Servidor * 2) + 1`. Se sua VPS tiver 4 CPUs, o Prisma processará cerca de 9 requisições pesadas ao banco por vez. As outras ficarão numa fila de espera interna (que dura até 10 segundos).
**O limite:** Se 500 alunos salvarem a prova no mesmo milissegundo, a fila do Prisma pode estourar o tempo de timeout (Timeout error) e a prova de alguns alunos não será salva.

Temos três níveis de solução para blindar o banco contra esse pico de alunos:

### Nível 1: A Solução Imediata (No Código)
Aumentar o limite de conexões e o tempo de timeout na `DATABASE_URL` do `.env`.
Exemplo: `?connection_limit=50&pool_timeout=30`
Isso permite processar mais conexões simultâneas e aumenta a paciência da fila de 10s para 30s.

### Nível 2: A Solução Elegante (PgBouncer)
Ativar o serviço **PgBouncer** no Coolify. Ele atua como um "porteiro" para o banco, segurando conexões massivas na memória com custo quase zero de RAM e repassando em lotes controlados para o PostgreSQL, evitando que o servidor trave.

### Nível 3: O "Padrão Ouro" Empresarial (Fila Assíncrona via Redis)
Empresas grandes e robustas usam isso (como o ENEM digital, Netflix, Uber). Em vez de o aluno falar direto com o Banco de Dados, ele joga a prova numa **Fila de Mensagens** super rápida (como Redis/BullMQ, Upstash, ou RabbitMQ) que processa as coisas "em background" (em segundo plano).

1. O aluno clica em "Entregar".
2. O sistema não tenta salvar no PostgreSQL. Ele apenas joga o JSON da prova numa Fila na memória (o que leva apenas 1 milissegundo) e avisa pro aluno: *"Prova Entregue!"*.
3. O aluno já pode sair e ir embora feliz.
4. Atrás das cortinas, um "Trabalhador" (Worker) do nosso sistema vai pegando as provas da fila uma por uma (ou de 10 em 10) e salvando calmamente no PostgreSQL.
**Resultado:** Você pode receber 1 milhão de entregas no mesmo segundo. A fila absorve tudo e vai enchendo a caixinha do banco no próprio ritmo dele, sem cair nunca.

**O que recomendamos:** Para o estado atual do Profacher 2.0, o **Nível 1** já evita 90% das dores de cabeça iniciais. Assim que fechar contratos com colégios inteiros usando o sistema na mesma manhã de provas, implementar o **Nível 2 (PgBouncer)** é o caminho mais seguro e fácil antes de precisarmos programar Filas em Background!
