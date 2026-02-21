import { UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const parents = [
  {
    fullName: "Глухих Нина Сергеевна",
    email: "nina.glukhikh.parent@example.com",
    morningReminderHour: 8,
    telegramEnabled: false
  },
  {
    fullName: "Глухих Егор Александрович",
    email: "egor.glukhikh.parent@example.com",
    morningReminderHour: 8,
    telegramEnabled: false
  }
];

const students = [
  { fullName: "Глухих Дарья Егоровна", grade: "5" },
  { fullName: "Глухих Виктория Егоровна", grade: "7" },
  { fullName: "Глухих Дмитрий Егорович", grade: "9" },
  { fullName: "Глухих Наталья Егоровна", grade: "11" }
];

async function upsertParent(parent) {
  const user = await prisma.user.upsert({
    where: { email: parent.email },
    update: {
      fullName: parent.fullName,
      role: UserRole.PARENT
    },
    create: {
      email: parent.email,
      fullName: parent.fullName,
      role: UserRole.PARENT,
      timezone: "Europe/Moscow",
      parentProfile: {
        create: {
          telegramEnabled: parent.telegramEnabled,
          morningReminderHour: parent.morningReminderHour
        }
      }
    },
    include: { parentProfile: true }
  });

  if (!user.parentProfile) {
    await prisma.parentProfile.create({
      data: {
        userId: user.id,
        telegramEnabled: parent.telegramEnabled,
        morningReminderHour: parent.morningReminderHour
      }
    });
  }

  return prisma.parentProfile.findUniqueOrThrow({ where: { userId: user.id } });
}

async function upsertStudent(student, idx) {
  const email = `child${idx + 1}.glukhikh.student@example.com`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: student.fullName,
      role: UserRole.STUDENT
    },
    create: {
      email,
      fullName: student.fullName,
      role: UserRole.STUDENT,
      timezone: "Europe/Moscow",
      studentProfile: {
        create: {
          grade: student.grade,
          diagnosticsSummary: "Заявка создана на старте проекта",
          problemSubjects: [],
          requestText: ""
        }
      }
    },
    include: { studentProfile: true }
  });

  if (!user.studentProfile) {
    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        grade: student.grade,
        diagnosticsSummary: "Заявка создана на старте проекта",
        problemSubjects: [],
        requestText: ""
      }
    });
  }

  return prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
}

async function main() {
  const parentProfiles = [];
  for (const parent of parents) {
    parentProfiles.push(await upsertParent(parent));
  }

  const studentProfiles = [];
  for (let index = 0; index < students.length; index += 1) {
    studentProfiles.push(await upsertStudent(students[index], index));
  }

  for (const student of studentProfiles) {
    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfiles[0].id,
          studentId: student.id
        }
      },
      update: {
        relationship: "mother",
        receivesMorningReminder: true
      },
      create: {
        parentId: parentProfiles[0].id,
        studentId: student.id,
        relationship: "mother",
        receivesMorningReminder: true
      }
    });

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parentProfiles[1].id,
          studentId: student.id
        }
      },
      update: {
        relationship: "father",
        receivesMorningReminder: false
      },
      create: {
        parentId: parentProfiles[1].id,
        studentId: student.id,
        relationship: "father",
        receivesMorningReminder: false
      }
    });
  }

  console.log("Family seed completed");
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
