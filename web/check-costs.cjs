const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'prof1@profacher.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  const exam = await prisma.exam.findFirst({
    where: { 
      teacherId: user.id,
      title: { contains: 'Simulado PO' }
    },
    include: {
      submissions: true
    }
  });
  if (!exam) {
    console.log('Exam not found');
    return;
  }
  console.log('Exam found:', exam.id, exam.title);
  if (exam.submissions.length === 0) {
    console.log('No submissions for this exam');
    return;
  }
  
    const sub = exam.submissions[0];
    console.log('\n--- Submission ID:', sub.id, 'Student:', sub.studentName, '---');
    
    let totalPrompt = 0;
    let totalCompletion = 0;
    
    // We didn't include answers. Let's fetch them directly.
    const answers = await prisma.examSubmissionAnswer.findMany({
      where: { submissionId: sub.id }
    });
    
    for (const ans of answers) {
      if (ans.aiTokensUsed) {
        let tokens;
        try {
          tokens = typeof ans.aiTokensUsed === 'string' ? JSON.parse(ans.aiTokensUsed) : ans.aiTokensUsed;
        } catch (e) {}
        if (tokens) {
          totalPrompt += tokens.promptTokens || tokens.input || 0;
          totalCompletion += tokens.completionTokens || tokens.output || 0;
        }
      }
    }
    
    // Cost estimation for GPT-4o-mini (approximate)
    // GPT-4o-mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
    const costUsd = (totalPrompt * 0.150 / 1000000) + (totalCompletion * 0.600 / 1000000);
    const costBrl = costUsd * 5.5;
    
    console.log('Total Input Tokens:', totalPrompt);
    console.log('Total Output Tokens:', totalCompletion);
    console.log('Estimated Cost (USD): $' + costUsd.toFixed(5));
    console.log('Estimated Cost (BRL): R$' + costBrl.toFixed(5));
}
run().catch(console.error).finally(() => prisma.$disconnect());
