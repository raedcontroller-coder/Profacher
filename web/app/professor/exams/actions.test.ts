import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getTeacherExams, deleteExam, regradeSubmissionWithAi } from './actions';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { gradeStudentAnswer } from '@/app/actions/aiAction';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    examSubmission: { findUnique: vi.fn(), update: vi.fn() }
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

vi.mock('@/app/actions/aiAction', () => ({
  gradeStudentAnswer: vi.fn()
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

  describe('regradeSubmissionWithAi', () => {
    it('deve recorrigir questoes pendentes com IA e atualizar nota total', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'PROFESSOR' } } as any);
      vi.mocked(prisma.examSubmission.findUnique).mockResolvedValue({
        id: 'sub-1',
        isPhysical: false,
        answers: { 101: 'A fotossíntese converte luz em energia química.' },
        correctionDetails: [
          {
            questionId: 101,
            question: 'Explique a fotossíntese.',
            type: 'ESSAY',
            studentAnswer: 'A fotossíntese converte luz em energia química.',
            pointsTotal: 2.0,
            pointsObtained: 0,
            feedback: '⚠️ Correção Pendente: Ocorreu uma falha de comunicação com a Inteligência Artificial.'
          }
        ],
        exam: {
          teacherId: 1,
          questions: [
            {
              question: {
                id: 101,
                content: 'Explique a fotossíntese.',
                type: 'ESSAY',
                points: 2.0,
                referenceAnswer: 'Processo pelo qual plantas convertem energia luminosa em energia química.',
                correctionMode: 'MODERATE',
                options: []
              }
            }
          ]
        }
      } as any);

      vi.mocked(gradeStudentAnswer).mockResolvedValue({
        success: true,
        score: 80,
        feedback: 'Boa explicação do processo.'
      });

      const res = await regradeSubmissionWithAi('sub-1', { onlyPending: true });

      expect(res.success).toBe(true);
      expect(res.correctedCount).toBe(1);
      expect(res.newTotalScore).toBeCloseTo(1.6);
      expect(prisma.examSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          score: 1.6,
          correctionDetails: [
            expect.objectContaining({
              questionId: 101,
              pointsObtained: 1.6,
              feedback: 'Boa explicação do processo.'
            })
          ]
        }
      });
    });

    it('deve retornar erro detalhado quando o modelo de IA estiver indisponivel ou sem saldo', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 1, role: 'PROFESSOR' } } as any);
      vi.mocked(prisma.examSubmission.findUnique).mockResolvedValue({
        id: 'sub-2',
        isPhysical: false,
        answers: { 102: 'Resposta do aluno' },
        correctionDetails: [
          {
            questionId: 102,
            question: 'Questão dissertativa',
            type: 'ESSAY',
            studentAnswer: 'Resposta do aluno',
            pointsTotal: 5.0,
            pointsObtained: 0,
            feedback: '⚠️ Correção Pendente: Falha anterior'
          }
        ],
        exam: {
          teacherId: 1,
          questions: [
            {
              question: {
                id: 102,
                content: 'Questão dissertativa',
                type: 'ESSAY',
                points: 5.0,
                referenceAnswer: 'Gabarito esperado',
                correctionMode: 'MODERATE',
                options: []
              }
            }
          ]
        }
      } as any);

      vi.mocked(gradeStudentAnswer).mockResolvedValue({
        success: false,
        error: 'Seus créditos acabaram. Recarregue para continuar usando os recursos de IA.'
      });

      const res = await regradeSubmissionWithAi('sub-2', { onlyPending: true });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Seus créditos acabaram. Recarregue para continuar usando os recursos de IA.');
      expect(res.updatedDetails?.[0]?.feedback).toContain('Seus créditos acabaram');
    });
  });
});

