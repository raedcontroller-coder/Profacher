import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { pusherServer } from '@/lib/pusher';

// Setup Mocks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: { findUnique: vi.fn() },
    examSubmission: { findUnique: vi.fn() }
  }
}));

vi.mock('@/lib/pusher', () => ({
  pusherServer: {
    authorizeChannel: vi.fn().mockReturnValue({ auth: 'mocked-auth' })
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn()
}));

describe('Pusher Auth Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (bodyStr: string, queryStr: string = '') => {
    return new Request(`http://localhost/api/pusher/auth${queryStr}`, {
      method: 'POST',
      body: bodyStr
    });
  };

  it('deve rejeitar requests sem socket_id ou channel_name', async () => {
    const req = createRequest('');
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid socket_id or channel_name');
  });

  it('deve retornar 404 se o channel_name for presence-exam-* mas o exam nao existir', async () => {
    vi.mocked(prisma.exam.findUnique).mockResolvedValue(null);
    
    const req = createRequest('socket_id=123&channel_name=presence-exam-XYZ');
    const res = await POST(req);
    
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Exam not found');
  });

  it('deve retornar 403 se o aluno estiver expulso', async () => {
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 'exam-id' } as any);
    vi.mocked(prisma.examSubmission.findUnique).mockResolvedValue({ isExpelled: true } as any);
    
    const req = createRequest('socket_id=123&channel_name=presence-exam-XYZ&student_ra=123&student_name=Aluno');
    const res = await POST(req);
    
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('Expelled');
  });

  it('deve autorizar estudante com sucesso (nao expulso)', async () => {
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 'exam-id' } as any);
    vi.mocked(prisma.examSubmission.findUnique).mockResolvedValue({ isExpelled: false } as any);
    
    const req = createRequest('socket_id=123&channel_name=presence-exam-XYZ&student_ra=123&student_name=Aluno');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(pusherServer.authorizeChannel).toHaveBeenCalledWith(
      '123',
      'presence-exam-XYZ',
      expect.objectContaining({ user_id: 'student-123' })
    );
  });

  it('deve autorizar professor com sessao valida', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: 'prof@fecap.br', name: 'Prof', id: '1' } } as any);
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 'exam-id' } as any);
    
    const req = createRequest('socket_id=123&channel_name=presence-exam-XYZ');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(pusherServer.authorizeChannel).toHaveBeenCalledWith(
      '123',
      'presence-exam-XYZ',
      expect.objectContaining({ user_id: 'prof@fecap.br' })
    );
  });

  it('deve retornar 401 se nao for estudante nem professor logado', async () => {
    vi.mocked(auth as any).mockResolvedValue(null);
    vi.mocked(prisma.exam.findUnique).mockResolvedValue({ id: 'exam-id' } as any);
    
    const req = createRequest('socket_id=123&channel_name=presence-exam-XYZ');
    const res = await POST(req);
    
    expect(res.status).toBe(401);
  });
});
