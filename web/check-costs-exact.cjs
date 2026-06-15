const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'prof1@profacher.com' } });
  
  const exam = await prisma.exam.findFirst({
    where: { 
      teacherId: user.id,
      title: { contains: 'Simulado PO' }
    },
    include: {
      submissions: true
    }
  });

  const sub = exam.submissions[0];
  
  if (!sub.correctionDetails) {
    console.log("No correction details found.");
    return;
  }
  
  let totalPromptChars = 0;
  let totalCompletionChars = 0;
  
  const details = typeof sub.correctionDetails === 'string' ? JSON.parse(sub.correctionDetails) : sub.correctionDetails;
  
  details.forEach(item => {
     // Estimating Prompt Length
     // System Prompt is roughly 800 chars
     totalPromptChars += 800; 
     
     if (item.question) totalPromptChars += item.question.length;
     if (item.correctAnswer) totalPromptChars += item.correctAnswer.length;
     if (item.studentAnswer) totalPromptChars += item.studentAnswer.length;
     
     // Estimating Completion Length
     // Output is JSON like {"analysis": "...", "score": 1, "feedback": "..."}
     totalCompletionChars += 150; // JSON overhead and analysis
     if (item.feedback) totalCompletionChars += item.feedback.length;
  });
  
  // 1 token = approx 4 chars
  const promptTokens = Math.ceil(totalPromptChars / 4);
  const completionTokens = Math.ceil(totalCompletionChars / 4);
  
  const costUsd = (promptTokens * 0.150 / 1000000) + (completionTokens * 0.600 / 1000000);
  const costBrl = costUsd * 5.5;
  
  console.log('--- COST ESTIMATE FOR 1 STUDENT ---');
  console.log('Student:', sub.studentName);
  console.log('Total Questions Evaluated:', details.length);
  console.log('Estimated Prompt Tokens:', promptTokens);
  console.log('Estimated Completion Tokens:', completionTokens);
  console.log('Estimated Cost (USD): $' + costUsd.toFixed(5));
  console.log('Estimated Cost (BRL): R$' + costBrl.toFixed(5));
}
run().catch(console.error).finally(() => prisma.$disconnect());
