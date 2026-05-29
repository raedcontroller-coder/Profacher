const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, fullName: true, roleId: true }
    });
    console.table(users);
}
main().finally(() => prisma.$disconnect());
