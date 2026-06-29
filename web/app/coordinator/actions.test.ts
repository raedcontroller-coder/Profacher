import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getInstitutionUsers, getPendingInvitationsAction, cancelInvitationAction } from './actions';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    invitation: { findMany: vi.fn(), delete: vi.fn() }
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Coordinator Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstitutionUsers', () => {
    it('deve disparar erro se o usuario nao estiver logado', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getInstitutionUsers()).rejects.toThrow('Não autorizado');
    });

    it('deve retornar vazio se usuario nao tem instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      
      const res = await getInstitutionUsers();
      expect(res).toEqual([]);
    });

    it('deve retornar usuarios da instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1 } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 1, name: 'User 1' }] as any);
      
      const res = await getInstitutionUsers();
      expect(res).toEqual([{ id: 1, name: 'User 1' }]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { institutionId: 1 }
      }));
    });
  });

  describe('getPendingInvitationsAction', () => {
    it('deve disparar erro se nao logado', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getPendingInvitationsAction()).rejects.toThrow('Não autorizado');
    });

    it('deve buscar convites pendentes da instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1 } as any);
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([{ id: 'inv1' }] as any);
      
      const res = await getPendingInvitationsAction();
      expect(res).toEqual([{ id: 'inv1' }]);
      expect(prisma.invitation.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          institutionId: 1,
          status: 'PENDING'
        })
      }));
    });
  });
});
