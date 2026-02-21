import { UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

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

const teachers = [
  {
    fullName: "Дулесова Ксения Ивановна",
    email: "dulesova.teacher@example.com",
    subjects: ["Английский язык"],
    canBeCurator: false
  },
  {
    fullName: "Воронцова Эльвира Николаевна",
    email: "vorontsova.teacher@example.com",
    subjects: ["Русский язык"],
    canBeCurator: true
  },
  {
    fullName: "Глухих Нина Сергеевна",
    email: "nina.glukhikh.teacher@example.com",
    subjects: ["Клубная деятельность"],
    canBeCurator: true
  },
  {
    fullName: "Глухих Егор Александрович",
    email: "egor.glukhikh.teacher@example.com",
    subjects: ["Клубная деятельность"],
    canBeCurator: true
  }
];

const psychologists = [
  {
    fullName: "Бикузина Ольга Анатольевна",
    email: "bikuzina.psychologist@example.com"
  }
];

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

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

async function upsertTeacher(teacher) {
  const user = await prisma.user.upsert({
    where: { email: teacher.email },
    update: {
      fullName: teacher.fullName,
      role: UserRole.TEACHER
    },
    create: {
      email: teacher.email,
      fullName: teacher.fullName,
      role: UserRole.TEACHER,
      timezone: "Europe/Moscow"
    }
  });

  await prisma.teacherProfile.upsert({
    where: { userId: user.id },
    update: {
      subjects: teacher.subjects,
      canBeCurator: teacher.canBeCurator
    },
    create: {
      userId: user.id,
      subjects: teacher.subjects,
      canBeCurator: teacher.canBeCurator
    }
  });
}

async function upsertPsychologist(psychologist) {
  await prisma.user.upsert({
    where: { email: psychologist.email },
    update: {
      fullName: psychologist.fullName,
      role: UserRole.PSYCHOLOGIST
    },
    create: {
      email: psychologist.email,
      fullName: psychologist.fullName,
      role: UserRole.PSYCHOLOGIST,
      timezone: "Europe/Moscow"
    }
  });
}

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@admin.ru" },
    update: {
      fullName: "Администратор CRM",
      role: UserRole.ADMIN,
      passwordHash: hashPassword("12345")
    },
    create: {
      email: "admin@admin.ru",
      fullName: "Администратор CRM",
      role: UserRole.ADMIN,
      passwordHash: hashPassword("12345"),
      timezone: "Europe/Moscow"
    }
  });

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

  for (const teacher of teachers) {
    await upsertTeacher(teacher);
  }

  for (const psychologist of psychologists) {
    await upsertPsychologist(psychologist);
  }

  console.log("Family and staff seed completed");
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
