# Guia de Conexão: Banco de Dados em Ambiente Local

Se o `npm run dev` local parar de conectar ao banco, siga este checklist.

## 1. O Túnel SSH caiu (Causa mais comum)
Quando o túnel cai, o erro no VS Code costuma ser `Can't reach database server`. No DBeaver ele dá `Connection Refused` ou `Read Timeout`.

**Solução**: Abra um novo PowerShell e rode o comando com "keep-alive" (para não cair sozinho):
```powershell
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -L 5433:10.0.1.7:5432 root@62.171.175.197
```
*Mantenha essa janela aberta. Se fechá-la, a conexão morre.*

---

## 2. IP do Banco no Servidor Mudou
O Coolify pode trocar o IP interno (`10.0.1.7`) se reiniciar.

**Como verificar**:
No terminal do **Servidor**, rode:
```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -q -f name=postgres)
```
Se o número for diferente de `10.0.1.7`, você precisa atualizar o comando do SSH (passo 1) e o arquivo `.env`.

---

## 3. Limpeza de Cache do Next.js
Às vezes o Next.js "vicia" no `.env` antigo.

**Solução**:
```powershell
# Na pasta /web
Remove-Item -Recurse -Force .\.next\
npm run dev
```

---

## 4. DBeaver vs Aplicação
- O **DBeaver** deve usar: `Host: localhost`, `Port: 5433`, `User/Pass` conforme no `.env`.
- O **Prisma/Next** usa a `DATABASE_URL` do `.env`.

### Dica de Ouro:
Se você trocar o `.env`, sempre pare o `npm run dev` com Ctrl+C e limpe a pasta `.next` antes de subir de novo.
