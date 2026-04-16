import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
 
const CODE_SEPARATOR = '<!-- PROFACHER_CODE_SEPARATOR -->';

interface ExamPdfData {
  studentName: string;
  studentRa: string;
  examTitle: string;
  accessCode: string;
  date: string;
  score: number;
  maxScore: number;
  showScore: boolean;
  details: {
    question: string;
    studentAnswer: any;
    correctAnswer?: string;
    pointsTotal: number;
    pointsObtained: number;
    feedback: string;
  }[];
}

/**
 * Remove tags HTML e decodifica entidades básicas para exibição em texto puro.
 */
const stripHtml = (html: string) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, '') // Remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .trim();
};

/**
 * Limpa o conteúdo de questões interativas e remove tags HTML.
 */
const cleanContent = (text: string) => {
  if (!text) return '';
  // Se for uma questão interativa, pega apenas o enunciado (antes do separador de código)
  const [enunciation] = text.split(CODE_SEPARATOR);
  return stripHtml(enunciation);
};

/**
 * Gera um PDF profissional como comprovante de entrega da prova.
 */
export const generateExamPdf = (data: ExamPdfData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Cabeçalho
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Profacher - Comprovante de Entrega', 14, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  const headerY = 35;
  doc.text(`Aluno: ${data.studentName}`, 14, headerY);
  doc.text(`RA: ${data.studentRa}`, 14, headerY + 6);
  doc.text(`Data: ${data.date}`, 14, headerY + 12);
  doc.text(`Código da Prova: ${data.accessCode}`, 14, headerY + 18);

  // 2. Tabela de Questões
  const tableData = data.details.map((d, index) => {
    // Tratar a resposta para exibição
    let studentAns = d.studentAnswer;
    if (typeof studentAns === 'object' && studentAns !== null) {
      studentAns = Object.entries(studentAns)
        .map(([key, val]) => `${val}`)
        .join(' | ');
    }

    const scoreText = `${d.pointsObtained.toFixed(1)} / ${d.pointsTotal.toFixed(1)}`;
    const status = d.pointsObtained === d.pointsTotal ? 'Correta' : d.pointsObtained > 0 ? 'Parcial' : 'Incorreta';

    if (data.showScore) {
    return [
      index + 1,
      cleanContent(d.question),
      stripHtml(studentAns || 'Não respondida'),
      stripHtml(d.feedback || '---'),
      `${scoreText} (${status})`
    ];
  } else {
    return [
      index + 1,
      cleanContent(d.question),
      stripHtml(studentAns || 'Não respondida')
    ];
  }
  });

  const columns = data.showScore 
    ? [['#', 'Questão', 'Sua Resposta', 'Feedback IA', 'Pontuação']]
    : [['#', 'Questão', 'Sua Resposta']];

  autoTable(doc, {
    startY: 60,
    head: columns,
    body: tableData,
    headStyles: { fillColor: [67, 79, 219], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 246, 255] },
    columnStyles: data.showScore ? {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 },
      4: { cellWidth: 25 }
    } : {
      0: { cellWidth: 10 },
      1: { cellWidth: 90 },
      2: { cellWidth: 80 }
    },
    styles: { overflow: 'linebreak', cellPadding: 5, fontSize: data.showScore ? 8 : 10 },
  });

  // 3. Nota Final
  if (data.showScore) {
    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`Nota Final: ${data.score.toFixed(1)} / ${data.maxScore.toFixed(1)}`, 14, lastY);
  }

  // 4. Rodapé
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Gerado automaticamente pelo sistema Profacher 2.0', 14, doc.internal.pageSize.getHeight() - 10);

  // Nome do arquivo
  const filename = `Comprovante_${data.studentName.replace(/\s+/g, '_')}_${data.accessCode}.pdf`;
  doc.save(filename);
};

// --- Funções para Professores ---

interface TeacherSummaryData {
  examTitle: string;
  accessCode: string;
  date: string;
  submissions: {
    studentName: string;
    studentRa: string;
    score: number | null;
    status: string;
    startedAt: string;
    finishedAt: string | null;
  }[];
}

/**
 * Gera um PDF resumo com as notas de todos os alunos da turma.
 */
export const generateTeacherSummaryPdf = (data: TeacherSummaryData) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Notas - Profacher', 14, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Prova: ${data.examTitle} (${data.accessCode})`, 14, 32);
  doc.text(`Data do Relatório: ${data.date}`, 14, 38);

  const tableData = data.submissions.map((s, idx) => [
    idx + 1,
    s.studentRa,
    s.studentName,
    s.status,
    s.score !== null ? s.score.toFixed(1) : '---',
    s.finishedAt ? new Date(s.finishedAt).toLocaleTimeString() : '---'
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['#', 'RA', 'Aluno', 'Status', 'Nota', 'Entrega']],
    body: tableData,
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  doc.save(`Resumo_Turma_${data.accessCode}.pdf`);
};

/**
 * Gera um PDF detalhado contendo as respostas de todos os alunos (um após o outro).
 */
export const generateFullDetailedClassPdf = (examTitle: string, accessCode: string, allStudents: ExamPdfData[]) => {
  const doc = new jsPDF();

  allStudents.forEach((student, index) => {
    if (index > 0) doc.addPage();

    // Reutilizando layout do comprovante individual mas sem o save imediato
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Relatório Individual Detalhado', 14, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Aluno: ${student.studentName} (${student.studentRa})`, 14, 32);
    doc.text(`Prova: ${student.examTitle}`, 14, 38);

    const tableData = student.details.map((d, i) => {
      let studentAns = d.studentAnswer;
      if (typeof studentAns === 'object' && studentAns !== null) {
        studentAns = Object.entries(studentAns).map(([k, v]) => `${v}`).join(' | ');
      }
      return [
        i + 1,
        cleanContent(d.question),
        stripHtml(studentAns || '---'),
        `${d.pointsObtained.toFixed(1)} / ${d.pointsTotal.toFixed(1)}`
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Questão', 'Resposta', 'Pts']],
      body: tableData,
      headStyles: { fillColor: [67, 79, 219] },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 80 }, 2: { cellWidth: 70 }, 3: { cellWidth: 20 } },
      styles: { fontSize: 8 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nota: ${student.score.toFixed(1)} / ${student.maxScore.toFixed(1)}`, 14, finalY);
  });

  doc.save(`Relatorio_Completo_${accessCode}.pdf`);
};
