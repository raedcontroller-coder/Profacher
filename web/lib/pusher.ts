import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

/**
 * Instância para uso no SERVIDOR (Server Actions / API Routes)
 * Usado para disparar eventos (ex: "Iniciar Prova")
 */
const serverHost = process.env.PUSHER_HOST_INTERNAL || process.env.NEXT_PUBLIC_PUSHER_HOST!;
const serverPort = process.env.NEXT_PUBLIC_PUSHER_PORT!;
const serverUseTLS = serverPort === '443' || serverHost.includes('sslip.io');

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  host: serverHost,
  port: serverPort,
  useTLS: serverUseTLS,
  cluster: 'mt1',
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

  const isSecure = host?.includes('sslip.io') || port === '443';

  const pusher = new PusherClient(key!, {
    cluster: 'mt1',
    authEndpoint: customAuthEndpoint || '/api/pusher/auth',
    wsHost: host!,
    wsPort: Number(port!),
    wssPort: Number(port!),
    forceTLS: isSecure,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
  });

  // Habilitar logging global para depuração profunda se necessário
  // PusherClient.logToConsole = true; 

  return pusher;
};
