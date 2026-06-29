import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
  headers: vi.fn(() => new Headers()),
}))

// Mock do auth() - Por padrao nao retorna nada, os testes de cada rota implementam seu mock
vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
}))

vi.mock('next-auth', () => {
  class AuthError extends Error {
    type: string;
    constructor(msg: string, type: string = 'CredentialsSignin') {
      super(msg);
      this.type = type;
      this.name = 'AuthError';
    }
  }
  return { AuthError }
})
