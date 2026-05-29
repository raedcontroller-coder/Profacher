const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const global = await prisma.globalSettings.findUnique({ where: { id: 1 } });
  
  if (global && global.savedAiKeys) {
      const keys = global.savedAiKeys.map(k => {
          if (k.model === 'gpt-3.5-turbo') {
              k.model = 'gpt-4o';
          }
          return k;
      });
      await prisma.globalSettings.update({
          where: { id: 1 },
          data: {
              globalAiModel: 'gpt-4o',
              savedAiKeys: keys
          }
      });
      console.log("Updated to gpt-4o successfully.");
  }
}
main().finally(() => prisma.$disconnect());
