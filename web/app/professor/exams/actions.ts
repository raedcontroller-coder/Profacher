'use server'
// v1.0.1 - Sincronização de exportações e Padronização de IDs

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const CODE_SEPARATOR = '<!-- PROFACHER_CODE_SEPARATOR -->';

export async function getTeacherExams() {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado ou sessão inválida" };
  }

  try {
    const exams = await prisma.exam.findMany({
      where: { teacherId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        accessCode: true,
        status: true,
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, exams };
  } catch (e: any) {
    console.error("Erro ao buscar exames:", e);
    return { success: false, error: e.message };
  }
}

export async function deleteExam(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado")
  }

  try {
    // Verificar se a prova pertence ao professor
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    });

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada ou acesso negado" };
    }

    await prisma.exam.delete({
      where: { id: examId }
    });

    return { success: true };
  } catch (e: any) {
    console.error("Erro ao excluir prova:", e);
    return { success: false, error: e.message };
  }
}

export async function openExamRoom(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado")
  }

  try {
    // 1. Gerar código único de 5 caracteres se não existir
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { accessCode: true, teacherId: true }
    });

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" };
    }

    let code = exam.accessCode;
    
    if (!code) {
      // Gerar código aleatório (ex: FD42G)
      const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
      let isUnique = false;
      
      while (!isUnique) {
        code = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        const existing = await prisma.exam.findUnique({ where: { accessCode: code } });
        if (!existing) isUnique = true;
      }
    }

    // 2. Atualizar status para WAITING
    await prisma.exam.update({
      where: { id: examId },
      data: { 
        accessCode: code,
        status: 'WAITING'
      }
    });

    return { success: true, accessCode: code };
  } catch (e: any) {
    console.error("Erro ao abrir sala:", e);
    return { success: false, error: e.message };
  }
}

export async function startExamLive(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    throw new Error("Não autorizado")
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { accessCode: true, teacherId: true }
    });

    if (!exam || exam.teacherId !== userId || !exam.accessCode) {
      return { success: false, error: "Prova não encontrada ou sem código" };
    }

    // 1. Atualizar status no banco
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'STARTED' }
    });

    // 2. Disparar evento via Soketi/Pusher
    const { pusherServer } = await import("@/lib/pusher");
    await pusherServer.trigger(`presence-exam-${exam.accessCode}`, 'exam:started', {
      examId: examId,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (e: any) {
    console.error("Erro ao iniciar prova live:", e);
    return { success: false, error: e.message };
  }
}

export async function stopExamLive(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    // 1. Validar se a prova pertence ao professor
    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    });

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" };
    }

    // 2. Voltar o status para WAITING
    await prisma.exam.update({
      where: { id: examId },
      data: { status: 'WAITING' }
    });

    // 3. Avisar os alunos via Socket para fecharem a prova
    if (exam.accessCode) {
      const { pusherServer } = await import("@/lib/pusher");
      await pusherServer.trigger(`presence-exam-${exam.accessCode}`, 'exam:finished', {
          examId: examId,
          timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (e: any) {
    console.error("Erro ao finalizar prova live (professor):", e);
    return { success: false, error: e.message };
  }
}

export async function getExamForMonitor(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        accessCode: true,
        status: true,
        teacherId: true,
        _count: {
          select: { questions: true }
        },
        submissions: {
          select: {
            id: true,
            studentName: true,
            studentRa: true,
            startedAt: true,
            finishedAt: true,
            score: true,
            isExpelled: true,
            answers: true
          }
        }
      }
    });

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" };
    }

    return { success: true, exam };
  } catch (e: any) {
    console.error("Erro ao buscar detalhes para monitoria:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Busca os detalhes completos de uma submissão para o modal do professor.
 */
export async function getSubmissionDetails(submissionId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!submission || submission.exam.teacherId !== userId) {
      return { success: false, error: "Submissão não encontrada" };
    }

    // Mapear respostas com enunciados
    const answers = (submission.answers as any) || {};
    const report = submission.exam.questions.map(eq => {
      const q = eq.question;
      const rawAns = answers[q.id];
      let studentAnswer: string = '';

      if (rawAns === undefined || rawAns === null) {
        studentAnswer = '— Não respondida —';
      } else if (q.type === 'MULTIPLE_CHOICE') {
        // rawAns é um ID numérico — busca o texto da opção correspondente
        const optId = Number(rawAns);
        const found = q.options.find((o: any) => o.id === optId);
        studentAnswer = found ? found.content : `Opção ID: ${rawAns}`;
      } else if (q.type === 'TRUE_FALSE') {
        let tfResult: any[] = [];
        // rawAns é um objeto { [optId]: 'V' | 'F' }
        if (typeof rawAns === 'object' && rawAns !== null) {
          const lines = Object.entries(rawAns as Record<string, string>).map(([optId, val]) => {
            const opt = q.options.find((o: any) => o.id === Number(optId));
            const label = opt ? opt.content : `Item ${optId}`;
            const expected = opt ? (opt.isCorrect ? 'V' : 'F') : '?';
            
            tfResult.push({
              statement: label,
              studentVal: val,
              expectedVal: expected,
              isCorrect: val === expected
            });

            return `${label}: ${val}`;
          });
          studentAnswer = lines.join('\n');
        } else {
          studentAnswer = String(rawAns);
        }

        return {
          questionId: q.id,
          content: q.content,
          type: q.type,
          studentAnswer,
          correctAnswer: q.referenceAnswer,
          points: q.points,
          options: q.options,
          tfResult
        };
      } else {
        // ESSAY / MATH — texto puro
        studentAnswer = typeof rawAns === 'string' ? rawAns : JSON.stringify(rawAns);
      }

      return {
        questionId: q.id,
        content: q.content,
        type: q.type,
        studentAnswer,
        correctAnswer: q.referenceAnswer,
        points: q.points,
        options: q.options
      };
    });

    return { 
      success: true, 
      studentName: submission.studentName,
      studentRa: submission.studentRa,
      score: submission.score,
      maxScore: submission.exam.questions.reduce((acc, q) => acc + q.question.points, 0),
      report 
    };
  } catch (e: any) {
    console.error("Erro ao buscar detalhes da submissão:", e);
    return { success: false, error: e.message };
  }
}

export async function getQuickExamStatus(accessCode: string) {
  try {
    const exam = await prisma.exam.findUnique({
      where: { accessCode },
      select: { status: true }
    });
    return { success: true, status: exam?.status || 'NOT_FOUND' };
  } catch (e) {
    return { success: false, error: "Erro ao verificar status" };
  }
}

export async function kickStudent(examId: number, studentRa: string) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    // 1. Validar propriedade da prova
    const exam = await prisma.exam.findFirst({
      where: { id: examId, teacherId: userId },
      select: { accessCode: true }
    });

    if (!exam) return { success: false, error: "Acesso negado" };

    // 2. Marcar como expulso no banco
    await prisma.examSubmission.update({
      where: { examId_studentRa: { examId, studentRa } },
      data: { 
        isExpelled: true,
        finishedAt: new Date()
      }
    });

    // 3. Disparar evento de expulsão imediata no Pusher
    const { pusherServer } = await import("@/lib/pusher");
    await pusherServer.trigger(`presence-exam-${exam.accessCode}`, 'student:kicked', {
      ra: studentRa,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (e: any) {
    console.error("Erro ao expulsar aluno:", e);
    return { success: false, error: e.message };
  }
}

function seededShuffle(array: any[], seed: string) {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  
  // Converter seed string para um número
  let seedNum = 0;
  for (let j = 0; j < seed.length; j++) {
    seedNum = (seedNum << 5) - seedNum + seed.charCodeAt(j);
    seedNum |= 0; // Converter para inteiro de 32 bits
  }
  
  const random = () => {
    seedNum = (seedNum * 1664525 + 1013904223) | 0;
    return (seedNum >>> 0) / 4294967296;
  };

  while (m) {
    i = Math.floor(random() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  return shuffled;
}

export async function getLiveExamQuestions(accessCode: string, studentName: string, studentRa: string) {
  try {
    // 1. Verificar se a prova existe e está iniciada
    const exam = await prisma.exam.findUnique({
      where: { accessCode },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    content: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!exam) {
      return { success: false, error: "Prova não encontrada" };
    }

    if (exam.status !== 'STARTED') {
      return { success: false, error: "A prova ainda não foi iniciada pelo professor" };
    }

    // 2. Tentar encontrar submissão existente
    const existingSubmission = await prisma.examSubmission.findUnique({
      where: {
        examId_studentRa: {
          examId: exam.id,
          studentRa: studentRa
        }
      }
    });

    // Se já finalizou ou foi expulso, bloqueia
    if (existingSubmission?.finishedAt) {
      if ((existingSubmission as any).isExpelled) {
        return { success: false, error: "Seu acesso a esta prova foi revogado pelo professor." };
      }
      return { success: false, error: "Você já finalizou e entregou esta prova." };
    }

    const submission = await prisma.examSubmission.upsert({
      where: {
        examId_studentRa: {
          examId: exam.id,
          studentRa: studentRa
        }
      },
      update: {
        studentName: studentName
      },
      create: {
        examId: exam.id,
        studentName: studentName,
        studentRa: studentRa,
        startedAt: new Date()
      }
    });

    const formattedQuestions = exam.questions.map(eq => ({
      id: eq.question.id,
      content: eq.question.content,
      type: eq.question.type,
      points: eq.question.points,
      // IMPORTANTE: Filtrar isCorrect para não vazar o gabarito para o aluno
      options: eq.question.options.map(opt => ({
        id: opt.id,
        content: opt.content
      }))
    }));

    return { 
      success: true, 
      exam: {
        id: exam.id,
        title: exam.title,
        showScore: exam.showScore,
        randomizeOrder: exam.randomizeOrder,
        questions: exam.randomizeOrder 
          ? seededShuffle(formattedQuestions, `${studentRa}-${exam.id}`)
          : formattedQuestions
      },
      submissionId: submission.id,
      previousAnswers: (submission.answers as any) || {}
    };
  } catch (e: any) {
    console.error("❌ ERRO CRÍTICO em getLiveExamQuestions:", e);
    return { 
      success: false, 
      error: e?.message || "Erro desconhecido ao carregar questões." 
    };
  }
}

export async function saveLiveAnswer(submissionId: number, questionId: number, answer: any) {
  try {
    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId }
    });

    if (!submission || submission.finishedAt) {
      return { success: false, error: "Submissão finalizada ou não encontrada" };
    }

    const currentAnswers = (submission.answers as any) || {};
    const updatedAnswers = {
      ...currentAnswers,
      [questionId]: answer
    };

    await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        answers: updatedAnswers
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error("Erro ao salvar resposta live:", e);
    return { success: false, error: e.message };
  }
}

export async function finishExamLive(submissionId: number) {
  try {
    const { gradeStudentAnswer } = await import("@/app/actions/aiAction");

    // 1. Buscar a submissão com a prova e questões (incluindo gabaritos)
    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!submission) return { success: false, error: "Submissão não encontrada" };
    
    const answers = (submission.answers as any) || {};
    let totalScore = 0;
    let maxScore = 0;
    const details: any[] = [];
    const aiCorrections: { index: number, promise: Promise<any> }[] = [];

    // 2. Calcular pontuação
    submission.exam.questions.forEach((eq, index) => {
      const q = eq.question;
      const studentAnswer = String(answers[q.id] || "").trim();
      const referenceAnswer = String(q.referenceAnswer || "").trim();
      maxScore += q.points;

      const detail: any = {
        question: q.content,
        type: q.type,
        studentAnswer: studentAnswer || "Não respondida",
        pointsTotal: q.points,
        pointsObtained: 0,
        feedback: ""
      };

      if (!studentAnswer) {
        detail.feedback = "Questão não respondida.";
        details.push(detail);
        return;
      }

      // ATALHO: Resposta Exata (Fast-Track)
      const isExactMatch = studentAnswer.toLowerCase() === referenceAnswer.toLowerCase();

      if (q.type === 'MULTIPLE_CHOICE') {
        const correctOption = q.options.find(opt => opt.isCorrect);
        const selectedOption = q.options.find(opt => String(opt.id).trim() === studentAnswer);
        
        detail.studentAnswer = selectedOption?.content || studentAnswer;
        detail.correctAnswer = correctOption?.content || "---";

        if (correctOption && studentAnswer === String(correctOption.id).trim()) {
          totalScore += q.points;
          detail.pointsObtained = q.points;
          detail.feedback = "Parabéns! Você selecionou a alternativa correta.";
        } else {
          detail.feedback = `Resposta incorreta. A alternativa correta era a "${detail.correctAnswer}".`;
        }
        details.push(detail);
      } 
      else if (q.type === 'TRUE_FALSE') {
        let correctCount = 0;
        const correctLabels: string[] = [];
        const studentLabels: string[] = [];
        const tfResult: any[] = [];
        const studentAnswersObj = answers[q.id] || {};
        
        q.options.forEach(opt => {
          const expected = opt.isCorrect ? 'V' : 'F';
          const studentVal = studentAnswersObj[opt.id] || '?';
          const isCorrect = studentVal === expected;
          
          correctLabels.push(`${opt.content}: ${expected}`);
          studentLabels.push(`${opt.content}: ${studentVal}`);
          
          tfResult.push({
            statement: opt.content,
            studentVal,
            expectedVal: expected,
            isCorrect
          });
          
          if (isCorrect) correctCount++;
        });

        detail.studentAnswer = "[DETEC_BACK] " + studentLabels.join(" | ");
        detail.correctAnswer = correctLabels.join(" | ");
        detail.tfResult = tfResult;

        if (q.options.length > 0) {
          const earned = (correctCount / q.options.length) * q.points;
          totalScore += earned;
          detail.pointsObtained = earned;
          detail.feedback = `Você acertou ${correctCount} de ${q.options.length} afirmações.`;
        }
        details.push(detail);
      }
      else if (q.type === 'ESSAY' || q.type === 'MATH') {
        detail.correctAnswer = referenceAnswer || "---";
        const currentDetailIndex = details.length;
        details.push(detail);
        
        if (isExactMatch && referenceAnswer) {
          detail.pointsObtained = q.points;
          detail.feedback = "Resposta idêntica ao gabarito esperado.";
          totalScore += q.points;
        } else if (referenceAnswer) {
          aiCorrections.push({
            index: currentDetailIndex,
            promise: (async () => {
              const result = await gradeStudentAnswer(q.content, referenceAnswer, studentAnswer, submission.exam.teacherId);
              if (result.success) {
                const earned = (result.score! / 100) * q.points;
                return { points: earned, feedback: result.feedback || "Corrigido pela IA." };
              }
              return { points: 0, feedback: "A IA não pôde processar esta resposta." };
            })()
          });
        }
      }
      else if (q.type === 'CUSTOM_HTML') {
        detail.studentAnswer = studentAnswer;
        detail.correctAnswer = referenceAnswer || "---";
        
        const currentDetailIndex = details.length;
        details.push(detail);

        if (isExactMatch && referenceAnswer) {
          detail.pointsObtained = q.points;
          detail.feedback = "Interação perfeita com o resultado esperado.";
          totalScore += q.points;
        } else if (referenceAnswer) {
          // Extrair apenas o enunciado para reduzir latência e custos
          const enunciation = q.content.includes(CODE_SEPARATOR) ? q.content.split(CODE_SEPARATOR)[0] : q.content;

          aiCorrections.push({
            index: currentDetailIndex,
            promise: (async () => {
              const result = await gradeStudentAnswer("QUESTÃO INTERATIVA: " + enunciation, referenceAnswer, studentAnswer, submission.exam.teacherId);
              if (result.success) {
                const earned = (result.score! / 100) * q.points;
                return { points: earned, feedback: result.feedback || "Interação avaliada pela IA." };
              }
              return { points: 0, feedback: "A IA não pôde avaliar esta interação." };
            })()
          });
        } else {
          detail.feedback = "Interação registrada com sucesso.";
        }
      }
    });

    // Aguardar correções da IA e injetar nos detalhes
    const aiResults = await Promise.all(aiCorrections.map(c => c.promise));
    aiCorrections.forEach((cor, i) => {
      const res = aiResults[i];
      totalScore += res.points;
      details[cor.index].pointsObtained = res.points;
      details[cor.index].feedback = res.feedback;
    });


    // 3. Atualizar submissão
    await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        finishedAt: new Date(),
        score: totalScore
      }
    });

    return { 
      success: true, 
      showScore: submission.exam.showScore,
      score: totalScore,
      maxScore: maxScore,
      details: details
    };
  } catch (e: any) {
    console.error("Erro ao finalizar prova live:", e);
    return { success: false, error: e.message };
  }
}

export async function getExamForEdit(examId: number) {
  const session = await auth()
  const userId = session?.user ? Number((session.user as any).id) : null

  if (!session || (session.user as any).role !== "PROFESSOR" || !userId) {
    return { success: false, error: "Não autorizado" };
  }

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });

    if (!exam || exam.teacherId !== userId) {
      return { success: false, error: "Prova não encontrada" };
    }

    if (exam.status === 'STARTED') {
      return { success: false, error: "Não é possível editar uma prova que está em andamento. Finalize a prova para editá-la." };
    }

    // Formatar para o frontend
    const formattedQuestions = exam.questions.map(eq => ({
      id: eq.question.id,
      content: eq.question.content,
      type: eq.question.type,
      points: eq.question.points,
      referenceAnswer: eq.question.referenceAnswer,
      options: eq.question.options.map(opt => ({
        content: opt.content,
        isCorrect: opt.isCorrect
      }))
    }));

    return {
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description || '',
        showScore: exam.showScore,
        randomizeOrder: exam.randomizeOrder,
        saveToBank: exam.saveToBank,
        questions: formattedQuestions
      }
    };
  } catch (e: any) {
    console.error("Erro ao buscar prova para edição:", e);
    return { success: false, error: e.message };
  }
}
