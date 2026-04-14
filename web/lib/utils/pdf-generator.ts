import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExamPdfData {
  studentName: string;
  studentRa: string;
  examTitle: string;
  accessCode: string;
  date: string;
  score: number;
  maxScore: number;
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

    return [
      index + 1,
      stripHtml(d.question),
      stripHtml(studentAns || 'Não respondida'),
      `${scoreText} (${status})`
    ];
  });

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Questão', 'Sua Resposta', 'Pontuação']],
    body: tableData,
    headStyles: { fillColor: [67, 79, 219], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 246, 255] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      2: { cellWidth: 60 },
      3: { cellWidth: 35 }
    },
    styles: { overflow: 'linebreak', cellPadding: 5 },
  });

  // 3. Nota Final
  const lastY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`Nota Final: ${data.score.toFixed(1)} / ${data.maxScore.toFixed(1)}`, 14, lastY);

  // 4. Rodapé
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Gerado automaticamente pelo sistema Profacher 2.0', 14, doc.internal.pageSize.getHeight() - 10);

  // Nome do arquivo
  const filename = `Comprovante_${data.studentName.replace(/\s+/g, '_')}_${data.accessCode}.pdf`;
  doc.save(filename);
};
