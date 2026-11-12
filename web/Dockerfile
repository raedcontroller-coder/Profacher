# Stage 1: Base image com openssl instalado uma única vez
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Stage 2: Dependencies & Build unificados (elimina a cópia física pesada de node_modules entre containers)
FROM base AS builder
# Copia apenas os manifestos primeiro para aproveitar o cache de camadas do Docker
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Instalação com cache mount do BuildKit para acelerar downloads e reutilizar pacotes no host
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

RUN npx prisma generate

# Copia o código-fonte após dependências e Prisma Client estarem prontos
COPY . .

# Argumentos de Build para variáveis NEXT_PUBLIC_ (Injetadas no bundle JS do Cliente)
ARG NEXT_PUBLIC_PUSHER_APP_KEY
ARG NEXT_PUBLIC_PUSHER_HOST
ARG NEXT_PUBLIC_PUSHER_PORT

ENV NEXT_PUBLIC_PUSHER_APP_KEY=$NEXT_PUBLIC_PUSHER_APP_KEY
ENV NEXT_PUBLIC_PUSHER_HOST=$NEXT_PUBLIC_PUSHER_HOST
ENV NEXT_PUBLIC_PUSHER_PORT=$NEXT_PUBLIC_PUSHER_PORT

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production server (herda de base, já possui openssl configurado)
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
