import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getTeacherExams, deleteExam } from './actions';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() }
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

describe('Professor Exams Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeacherExams', () => {
    it('deve retornar erro de autorizacao se nao houver sessao', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const res = await getTeacherExams();
      expect(res).toEqual({ success: false, error: 'Não autorizado ou sessão inválida' });
    });

    it('deve retornar erro se usuario logado nao for professor', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'STUDENT' } } as any);
      const res = await getTeacherExams();
      expect(res).toEqual({ success: false, error: 'Não autorizado ou sessão inválida' });
    });

    it('deve retornar provas se o professor estiver autorizado', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'PROFESSOR' } } as any);
      vi.mocked(prisma.exam.findMany).mockResolvedValue([{ id: 1, title: 'Prova 1' }] as any);
      
      const res = await getTeacherExams();
      expect(res).toEqual({ success: true, exams: [{ id: 1, title: 'Prova 1' }] });
      expect(prisma.exam.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { teacherId: 1 }
      }));
    });
  });

  describe('deleteExam', () => {
    it('deve barrar acesso se a prova nao for do professor (IDOR/RLS Test)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'PROFESSOR' } } as any);
      
      // Prova pertence ao professor 2
      vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 10, teacherId: 2 } as any);
      
      const res = await deleteExam(10);
      expect(res).toEqual({ success: false, error: 'Prova não encontrada ou acesso negado' });
      expect(prisma.exam.delete).not.toHaveBeenCalled();
    });

    it('deve deletar a prova se pertencer ao professor logado', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'PROFESSOR' } } as any);
      
      // Prova pertence ao professor logado (id 1)
      vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 10, teacherId: 1 } as any);
      vi.mocked(prisma.exam.delete).mockResolvedValue({ id: 10 } as any);
      
      const res = await deleteExam(10);
      expect(res).toEqual({ success: true });
      expect(prisma.exam.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });
  });
});
