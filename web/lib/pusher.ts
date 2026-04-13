import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

/**
 * Instância para uso no SERVIDOR (Server Actions / API Routes)
 * Usado para disparar eventos (ex: "Iniciar Prova")
 */
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  host: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  port: process.env.NEXT_PUBLIC_PUSHER_PORT!,
  useTLS: false, // Soketi costuma usar HTTP em ambientes de dev/Docker
  cluster: 'mt1', // Requisito do Pusher, mas ignorado pelo Soketi
});

/**
 * Instância para uso no CLIENTE (Navegador)
 * Permite assinar canais e ouvir eventos em tempo real
 */
export const getPusherClient = (customAuthEndpoint?: string) => {
  const key = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const host = process.env.NEXT_PUBLIC_PUSHER_HOST;
  const port = process.env.NEXT_PUBLIC_PUSHER_PORT;

  if (!key || !host || !port) {
    console.error("❌ PUSHER CONFIG ERROR: Variáveis de ambiente faltando no CLIENTE!", {
      key: !!key,
      host: !!host,
      port: !!port
    });
  }

  const pusher = new PusherClient(key!, {
    cluster: 'mt1',
    authEndpoint: customAuthEndpoint || '/api/pusher/auth',
    wsHost: host!,
    wsPort: Number(port!),
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
  });

  // Habilitar logging global para depuração profunda se necessário
  // PusherClient.logToConsole = true; 

  return pusher;
};
