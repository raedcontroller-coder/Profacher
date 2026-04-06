import { auth } from "./auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthPage) {
    // Usa o AUTH_URL do ambiente se disponível, senão cai pro origin. 
    // Evita redirecionamentos para hostnames internos do Docker que o cliente não consegue resolver.
    const baseUrl = process.env.AUTH_URL || req.nextUrl.origin;
    return Response.redirect(new URL("/login", baseUrl));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|bg.png|RaedLogo.svg).*)',
  ],
};
