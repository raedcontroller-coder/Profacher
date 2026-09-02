import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getInstitutionUsers, getPendingInvitationsAction, cancelInvitationAction } from './actions';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    invitation: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() }
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const COORDINATOR = { role: { name: 'COORDINATOR' } };
const PROFESSOR = { role: { name: 'PROFESSOR' } };

describe('Coordinator Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstitutionUsers', () => {
    it('deve disparar erro se o usuario nao estiver logado', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getInstitutionUsers()).rejects.toThrow('Não autorizado');
    });

    it('deve disparar erro se usuario nao for coordenador', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...PROFESSOR } as any);

      await expect(getInstitutionUsers()).rejects.toThrow('Não autorizado');
    });

    it('deve retornar vazio se usuario nao tem instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: null, ...COORDINATOR } as any);

      const res = await getInstitutionUsers();
      expect(res).toEqual([]);
    });

    it('deve retornar usuarios da instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...COORDINATOR } as any);
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

    it('deve disparar erro se usuario nao for coordenador', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...PROFESSOR } as any);

      await expect(getPendingInvitationsAction()).rejects.toThrow('Não autorizado');
    });

    it('deve buscar convites pendentes da instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...COORDINATOR } as any);
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

  describe('cancelInvitationAction', () => {
    it('deve disparar erro se usuario nao for coordenador', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...PROFESSOR } as any);

      await expect(cancelInvitationAction('inv1')).rejects.toThrow('Não autorizado');
    });

    it('deve disparar erro se o convite nao pertence a instituicao do coordenador', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...COORDINATOR } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ id: 'inv1', institutionId: 2 } as any);

      await expect(cancelInvitationAction('inv1')).rejects.toThrow('Convite não encontrado');
      expect(prisma.invitation.delete).not.toHaveBeenCalled();
    });

    it('deve cancelar o convite da propria instituicao', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { email: 'test@test.com' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ institutionId: 1, ...COORDINATOR } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ id: 'inv1', institutionId: 1 } as any);
      vi.mocked(prisma.invitation.delete).mockResolvedValue({ id: 'inv1' } as any);

      const res = await cancelInvitationAction('inv1');
      expect(res).toEqual({ success: true });
    });
  });
});
