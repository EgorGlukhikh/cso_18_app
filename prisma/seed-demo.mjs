import { ActivityType, EventStatus, ParticipantRole, UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const teacherSeed = [
  { fullName: "Дулесова Ксения Ивановна", email: "dulesova.teacher@example.com", subjects: ["Английский язык"] },
  { fullName: "Воронцова Эльвира Николаевна", email: "vorontsova.teacher@example.com", subjects: ["Русский язык"] },
  { fullName: "Глухих Нина Сергеевна", email: "nina.glukhikh.teacher@example.com", subjects: ["Клубная деятельность"] },
  { fullName: "Глухих Егор Александрович", email: "egor.glukhikh.teacher@example.com", subjects: ["Клубная деятельность"] },
  { fullName: "Бикузина Ольга Анатольевна", email: "bikuzina.psychologist@example.com", subjects: ["Психология"] }
];

function toIsoDay(date) {
  return date.toLocaleDateString("sv-SE");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function ensureAdmin() {
  return prisma.user.upsert({
    where: { email: "admin@admin.ru" },
    update: { fullName: "Администратор CRM", role: UserRole.ADMIN },
    create: {
      email: "admin@admin.ru",
      fullName: "Администратор CRM",
      role: UserRole.ADMIN,
      timezone: "Europe/Moscow"
    }
  });
}

async function ensureTeachers() {
  const users = [];
  for (const teacher of teacherSeed) {
    const role = teacher.subjects.includes("Психология") ? UserRole.PSYCHOLOGIST : UserRole.TEACHER;
    const user = await prisma.user.upsert({
      where: { email: teacher.email },
      update: { fullName: teacher.fullName, role },
      create: {
        email: teacher.email,
        fullName: teacher.fullName,
        role,
        timezone: "Europe/Moscow"
      }
    });

    if (role === UserRole.TEACHER) {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: { subjects: teacher.subjects, canBeCurator: true },
        create: { userId: user.id, subjects: teacher.subjects, canBeCurator: true }
      });
    }

    users.push(user);
  }
  return users;
}

async function ensureParents() {
  const result = [];
  for (let i = 1; i <= 10; i += 1) {
    const email = `demo.parent${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { fullName: `Тестовый Родитель ${i}`, role: UserRole.PARENT },
      create: {
        email,
        fullName: `Тестовый Родитель ${i}`,
        role: UserRole.PARENT,
        phone: `+79990000${String(i).padStart(2, "0")}`,
        timezone: "Europe/Moscow"
      }
    });

    const profile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      update: { telegramEnabled: i % 2 === 0, morningReminderHour: 8, comment: `Комментарий родителя ${i}` },
      create: {
        userId: user.id,
        telegramEnabled: i % 2 === 0,
        morningReminderHour: 8,
        comment: `Комментарий родителя ${i}`
      }
    });

    result.push({ user, profile });
  }
  return result;
}

async function ensureStudents() {
  const result = [];
  for (let i = 1; i <= 15; i += 1) {
    const email = `demo.student${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { fullName: `Тестовый Ученик ${i}`, role: UserRole.STUDENT },
      create: {
        email,
        fullName: `Тестовый Ученик ${i}`,
        role: UserRole.STUDENT,
        phone: `+78880000${String(i).padStart(2, "0")}`,
        timezone: "Europe/Moscow"
      }
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        grade: String((i % 11) + 1),
        problemSubjects: i % 2 === 0 ? ["Математика"] : ["Русский язык"],
        requestText: `Запрос ученика ${i}`,
        comment: `Комментарий ученика ${i}`
      },
      create: {
        userId: user.id,
        grade: String((i % 11) + 1),
        diagnosticsSummary: "Тестовая карточка",
        problemSubjects: i % 2 === 0 ? ["Математика"] : ["Русский язык"],
        requestText: `Запрос ученика ${i}`,
        comment: `Комментарий ученика ${i}`
      }
    });

    result.push({ user, profile });
  }
  return result;
}

async function ensureLinks(parents, students) {
  for (let i = 0; i < students.length; i += 1) {
    const firstParent = parents[i % parents.length];
    const secondParent = parents[(i + 3) % parents.length];

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: firstParent.profile.id,
          studentId: students[i].profile.id
        }
      },
      update: { relationship: "родитель 1", receivesMorningReminder: true },
      create: {
        parentId: firstParent.profile.id,
        studentId: students[i].profile.id,
        relationship: "родитель 1",
        receivesMorningReminder: true
      }
    });

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: secondParent.profile.id,
          studentId: students[i].profile.id
        }
      },
      update: { relationship: "родитель 2", receivesMorningReminder: false },
      create: {
        parentId: secondParent.profile.id,
        studentId: students[i].profile.id,
        relationship: "родитель 2",
        receivesMorningReminder: false
      }
    });
  }
}

async function createEventIfMissing(data) {
  const exists = await prisma.event.findFirst({
    where: {
      title: data.title,
      plannedStartAt: data.plannedStartAt,
      plannedEndAt: data.plannedEndAt
    }
  });
  if (exists) return exists;

  return prisma.event.create({ data });
}

async function ensureEvents(admin, teachers, students) {
  const teacherUsers = teachers.filter((t) => t.role === UserRole.TEACHER);
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);

  const mondays = [];
  for (let d = new Date(base); mondays.length < 4; d = addDays(d, 1)) {
    if (d.getDay() === 1) mondays.push(new Date(d));
  }

  for (let i = 0; i < mondays.length; i += 1) {
    const day = mondays[i];
    const start = new Date(`${toIsoDay(day)}T10:00:00.000Z`);
    const end = new Date(`${toIsoDay(day)}T12:00:00.000Z`);

    const event = await createEventIfMissing({
      title: `Административная встреча педагогов #${i + 1}`,
      subject: "Планерка",
      activityType: ActivityType.TEACHERS_GENERAL_MEETING,
      status: EventStatus.PLANNED,
      plannedStartAt: start,
      plannedEndAt: end,
      plannedHours: 2,
      billableHours: 0,
      isPaid: true,
      createdByUserId: admin.id
    });

    for (const teacher of teacherUsers) {
      await prisma.eventParticipant.upsert({
        where: {
          eventId_userId_participantRole: {
            eventId: event.id,
            userId: teacher.id,
            participantRole: ParticipantRole.TEACHER
          }
        },
        update: {},
        create: {
          eventId: event.id,
          userId: teacher.id,
          participantRole: ParticipantRole.TEACHER
        }
      });
    }
  }

  const titles = [
    "Индивидуальная математика",
    "Индивидуальный русский",
    "Групповой английский",
    "Групповая математика"
  ];

  let created = 0;
  for (let i = 0; created < 16; i += 1) {
    const day = addDays(base, i);
    if (day.getDay() === 0 || day.getDay() === 6) continue;

    const startHour = created % 2 === 0 ? 14 : 16;
    const start = new Date(`${toIsoDay(day)}T${String(startHour).padStart(2, "0")}:00:00.000Z`);
    const end = new Date(start.getTime() + 45 * 60000);
    const isGroup = created % 3 === 0;
    const teacher = teacherUsers[created % teacherUsers.length];

    const event = await createEventIfMissing({
      title: `${titles[created % titles.length]} #${created + 1}`,
      subject: isGroup ? "Групповая работа" : "Индивидуальная работа",
      activityType: isGroup ? ActivityType.GROUP_LESSON : ActivityType.INDIVIDUAL_LESSON,
      status: EventStatus.PLANNED,
      plannedStartAt: start,
      plannedEndAt: end,
      plannedHours: 1,
      billableHours: 0,
      isPaid: true,
      createdByUserId: admin.id
    });

    await prisma.eventParticipant.upsert({
      where: {
        eventId_userId_participantRole: {
          eventId: event.id,
          userId: teacher.id,
          participantRole: ParticipantRole.TEACHER
        }
      },
      update: {},
      create: {
        eventId: event.id,
        userId: teacher.id,
        participantRole: ParticipantRole.TEACHER
      }
    });

    const studentsForEvent = isGroup
      ? [students[created % students.length], students[(created + 1) % students.length], students[(created + 2) % students.length]]
      : [students[created % students.length]];

    for (const student of studentsForEvent) {
      await prisma.eventParticipant.upsert({
        where: {
          eventId_userId_participantRole: {
            eventId: event.id,
            userId: student.user.id,
            participantRole: ParticipantRole.STUDENT
          }
        },
        update: {},
        create: {
          eventId: event.id,
          userId: student.user.id,
          participantRole: ParticipantRole.STUDENT
        }
      });
    }

    created += 1;
  }
}

async function main() {
  const admin = await ensureAdmin();
  const teachers = await ensureTeachers();
  const parents = await ensureParents();
  const students = await ensureStudents();

  await ensureLinks(parents, students);
  await ensureEvents(admin, teachers, students);

  console.log("Demo seed completed: 10 parents, 15 students, 20 events");
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
