import { vi, describe, it, expect, beforeEach } from 'vitest';
import { loginAction } from './actions';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() }
  }
}));

vi.mock('@/auth', () => ({
  signIn: vi.fn()
}));

describe('Login Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createFormData = (email: string, pass: string) => {
    const fd = new FormData();
    fd.append('email', email);
    fd.append('password', pass);
    return fd;
  };

  it('deve redirecionar coordenador para /coordinator', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: { name: 'COORDINATOR' } } as any);
    
    // Como signIn dá throw redirect no sucesso, simulamos um erro qualquer para n quebrar
    const testError = new Error('RedirectError');
    vi.mocked(signIn).mockRejectedValue(testError);
    
    const formData = createFormData('coord@fecap.br', '123');
    await expect(loginAction(undefined, formData)).rejects.toThrow('RedirectError');
    
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'coord@fecap.br',
      password: '123',
      redirectTo: '/coordinator'
    });
  });

  it('deve redirecionar professor para /professor', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: { name: 'PROFESSOR' } } as any);
    
    const testError = new Error('RedirectError');
    vi.mocked(signIn).mockRejectedValue(testError);
    
    const formData = createFormData('prof@fecap.br', '123');
    await expect(loginAction(undefined, formData)).rejects.toThrow('RedirectError');
    
    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'prof@fecap.br',
      password: '123',
      redirectTo: '/professor'
    });
  });

  it('deve retornar mensagem de erro amigavel se for AuthError (Credenciais invalidas)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: { name: 'PROFESSOR' } } as any);
    
    const authError = new AuthError('Invalid credentials');
    authError.type = 'CredentialsSignin';
    vi.mocked(signIn).mockRejectedValue(authError);
    
    const formData = createFormData('prof@fecap.br', 'errada');
    const result = await loginAction(undefined, formData);

    expect(result).toEqual({ error: 'E-mail ou senha incorretos.' });
  });

  it('deve sinalizar e-mail não confirmado quando authorize lança EMAIL_NOT_VERIFIED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: { name: 'PROFESSOR' } } as any);

    const authError = new AuthError('Detalhe_Authorize: EMAIL_NOT_VERIFIED');
    authError.type = 'CallbackRouteError';
    vi.mocked(signIn).mockRejectedValue(authError);

    const formData = createFormData('prof@fecap.br', '123');
    const result = await loginAction(undefined, formData);

    expect(result).toEqual({
      error: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
      emailNotVerified: true,
      email: 'prof@fecap.br',
    });
  });
});
