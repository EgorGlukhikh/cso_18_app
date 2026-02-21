import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  { code: "STUDENT_SICK", name: "Болезнь ученика", sortOrder: 10 },
  { code: "PARENT_CANCEL", name: "Отмена родителем", sortOrder: 20 },
  { code: "ABSENT_NO_NOTICE", name: "Неявка без предупреждения", sortOrder: 30 },
  { code: "TEACHER_SICK", name: "Болезнь педагога", sortOrder: 40 },
  { code: "CENTER_RESCHEDULE", name: "Перенос центром", sortOrder: 50 },
  { code: "FORCE_MAJEURE", name: "Форс-мажор", sortOrder: 60 },
  { code: "OTHER", name: "Другое", sortOrder: 999 }
];

async function main() {
  for (const reason of defaults) {
    await prisma.cancelReason.upsert({
      where: { code: reason.code },
      update: {
        name: reason.name,
        sortOrder: reason.sortOrder,
        isActive: true
      },
      create: reason
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
