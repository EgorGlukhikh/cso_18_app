import { ActivityType, EventStatus, ParticipantRole, UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const parentsSeed = [
  { fullName: "Иванова Мария Сергеевна", phone: "+79991000001" },
  { fullName: "Иванов Сергей Петрович", phone: "+79991000002" },
  { fullName: "Смирнова Ольга Андреевна", phone: "+79991000003" },
  { fullName: "Смирнов Андрей Николаевич", phone: "+79991000004" },
  { fullName: "Кузнецова Елена Викторовна", phone: "+79991000005" },
  { fullName: "Кузнецов Виктор Павлович", phone: "+79991000006" },
  { fullName: "Попова Наталья Игоревна", phone: "+79991000007" },
  { fullName: "Попов Игорь Владимирович", phone: "+79991000008" },
  { fullName: "Соколова Анна Романовна", phone: "+79991000009" },
  { fullName: "Соколов Роман Евгеньевич", phone: "+79991000010" },
  { fullName: "Петрова Лидия Максимовна", phone: "+79991000011" },
  { fullName: "Петров Максим Олегович", phone: "+79991000012" },
  { fullName: "Морозова Дарья Владимировна", phone: "+79991000013" },
  { fullName: "Морозов Владимир Анатольевич", phone: "+79991000014" },
  { fullName: "Захарова Ирина Николаевна", phone: "+79991000015" }
];

const studentsSeed = [
  { fullName: "Иванова Алиса Сергеевна", grade: "5", problemSubjects: ["Русский язык"] },
  { fullName: "Иванов Максим Сергеевич", grade: "6", problemSubjects: ["Математика"] },
  { fullName: "Смирнова Полина Андреевна", grade: "7", problemSubjects: ["Английский язык"] },
  { fullName: "Смирнов Артем Андреевич", grade: "8", problemSubjects: ["Русский язык"] },
  { fullName: "Кузнецова Софья Викторовна", grade: "9", problemSubjects: ["Математика"] },
  { fullName: "Кузнецов Даниил Викторович", grade: "5", problemSubjects: ["Английский язык"] },
  { fullName: "Попова Варвара Игоревна", grade: "6", problemSubjects: ["Русский язык"] },
  { fullName: "Попов Тимофей Игоревич", grade: "7", problemSubjects: ["Математика"] },
  { fullName: "Соколова Ева Романовна", grade: "8", problemSubjects: ["Английский язык"] },
  { fullName: "Соколов Матвей Романович", grade: "9", problemSubjects: ["Русский язык"] }
];

const parentLinksSeed = [
  [0, 1],
  [0, 1],
  [2, 3],
  [2, 3],
  [4, 5],
  [4, 5],
  [6, 7],
  [6, 7],
  [8, 9],
  [8, 9]
];

const subjectCatalog = [
  "Английский язык",
  "Русский язык",
  "Математика",
  "Клубная деятельность",
  "Психология",
  "История",
  "Биология"
];

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcDateTime(day, hours, minutes) {
  return new Date(`${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000Z`);
}

function distributeIndividualLessons(total) {
  const result = [2, 2, 2, 2, 2];
  let remaining = total - 10;
  for (let i = 0; i < result.length && remaining > 0; i += 1) {
    result[i] += 1;
    remaining -= 1;
  }
  return result;
}

async function ensureSubjectCatalog() {
  for (let i = 0; i < subjectCatalog.length; i += 1) {
    await prisma.subject.upsert({
      where: { name: subjectCatalog[i] },
      update: { isActive: true, sortOrder: i + 1 },
      create: { name: subjectCatalog[i], isActive: true, sortOrder: i + 1 }
    });
  }
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

async function ensureParents() {
  const items = [];
  for (let i = 0; i < parentsSeed.length; i += 1) {
    const email = `load.parent${String(i + 1).padStart(2, "0")}@example.com`;
    const parent = parentsSeed[i];
    const user = await prisma.user.upsert({
      where: { email },
      update: { fullName: parent.fullName, role: UserRole.PARENT, phone: parent.phone },
      create: {
        email,
        fullName: parent.fullName,
        role: UserRole.PARENT,
        phone: parent.phone,
        timezone: "Europe/Moscow"
      }
    });

    const profile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      update: {
        telegramEnabled: i % 3 === 0,
        morningReminderHour: 8,
        comment: `Тестовый родитель #${i + 1}`
      },
      create: {
        userId: user.id,
        telegramEnabled: i % 3 === 0,
        morningReminderHour: 8,
        comment: `Тестовый родитель #${i + 1}`
      }
    });

    items.push({ user, profile });
  }
  return items;
}

async function ensureStudents() {
  const items = [];
  for (let i = 0; i < studentsSeed.length; i += 1) {
    const student = studentsSeed[i];
    const email = `load.student${String(i + 1).padStart(2, "0")}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { fullName: student.fullName, role: UserRole.STUDENT, phone: `+7999200${String(i + 1).padStart(4, "0")}` },
      create: {
        email,
        fullName: student.fullName,
        role: UserRole.STUDENT,
        phone: `+7999200${String(i + 1).padStart(4, "0")}`,
        timezone: "Europe/Moscow"
      }
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        grade: student.grade,
        diagnosticsSummary: "Тестовая карточка для проверки расписания",
        problemSubjects: student.problemSubjects,
        requestText: `Нужна помощь по предметам: ${student.problemSubjects.join(", ")}`,
        comment: `Тестовый ученик #${i + 1}`
      },
      create: {
        userId: user.id,
        grade: student.grade,
        diagnosticsSummary: "Тестовая карточка для проверки расписания",
        problemSubjects: student.problemSubjects,
        requestText: `Нужна помощь по предметам: ${student.problemSubjects.join(", ")}`,
        comment: `Тестовый ученик #${i + 1}`
      }
    });
    items.push({ user, profile });
  }
  return items;
}

async function ensureParentStudentLinks(parents, students) {
  for (let i = 0; i < students.length; i += 1) {
    const [firstParentIdx, secondParentIdx] = parentLinksSeed[i];
    const firstParent = parents[firstParentIdx];
    const secondParent = parents[secondParentIdx];

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: firstParent.profile.id,
          studentId: students[i].profile.id
        }
      },
      update: { relationship: "мать", receivesMorningReminder: true },
      create: {
        parentId: firstParent.profile.id,
        studentId: students[i].profile.id,
        relationship: "мать",
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
      update: { relationship: "отец", receivesMorningReminder: false },
      create: {
        parentId: secondParent.profile.id,
        studentId: students[i].profile.id,
        relationship: "отец",
        receivesMorningReminder: false
      }
    });
  }
}

async function getPedagogues() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.TEACHER, UserRole.CURATOR, UserRole.PSYCHOLOGIST] }
    },
    include: { teacherProfile: true },
    orderBy: { fullName: "asc" }
  });

  if (!users.length) {
    throw new Error("В системе нет педагогов. Сначала выполните prisma:seed-family");
  }
  return users;
}

async function deleteOldLoadpackEvents(adminUserId, from, to) {
  const toDelete = await prisma.event.findMany({
    where: {
      createdByUserId: adminUserId,
      title: { startsWith: "LOADPACK " },
      plannedStartAt: { gte: from, lte: to }
    },
    select: { id: true }
  });

  if (!toDelete.length) return;
  const ids = toDelete.map((item) => item.id);
  await prisma.eventParticipant.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.eventConfirmationTask.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.event.deleteMany({ where: { id: { in: ids } } });
}

async function createEventWithParticipants(data, participants) {
  return prisma.event.create({
    data: {
      ...data,
      participants: {
        create: participants
      }
    }
  });
}

async function seedEvents(admin, pedagogues, students) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  await deleteOldLoadpackEvents(admin.id, monthStart, monthEnd);

  const mondays = [];
  for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
    if (d.getUTCDay() === 1) mondays.push(new Date(d));
  }

  for (const monday of mondays) {
    const day = isoDate(monday);
    const start = utcDateTime(day, 10, 0);
    const end = utcDateTime(day, 12, 0);
    await createEventWithParticipants(
      {
        title: `LOADPACK Административная встреча ${day}`,
        subject: "Клубная деятельность",
        activityType: ActivityType.TEACHERS_GENERAL_MEETING,
        status: EventStatus.PLANNED,
        plannedStartAt: start,
        plannedEndAt: end,
        plannedHours: 2,
        billableHours: 2,
        isPaid: true,
        createdByUserId: admin.id
      },
      pedagogues.map((teacher) => ({
        userId: teacher.id,
        participantRole: teacher.role === UserRole.PSYCHOLOGIST ? ParticipantRole.PSYCHOLOGIST : ParticipantRole.TEACHER
      }))
    );
  }

  const nonAdminTarget = 20 - mondays.length;
  const groupTarget = 2;
  const individualTarget = nonAdminTarget - groupTarget;
  const dailyLoads = distributeIndividualLessons(individualTarget);

  const firstMonday = new Date(monthStart);
  while (firstMonday.getUTCDay() !== 1) {
    firstMonday.setUTCDate(firstMonday.getUTCDate() + 1);
  }
  const weekdays = Array.from({ length: 5 }, (_, index) => addDays(firstMonday, index));
  const timeSlots = [
    [9, 0],
    [11, 0],
    [15, 0]
  ];

  const teacherPool = pedagogues.filter((user) => user.role !== UserRole.PSYCHOLOGIST);
  if (!teacherPool.length) {
    throw new Error("Нет педагогов с ролью TEACHER/CURATOR для учебных занятий");
  }

  let eventIndex = 0;
  for (let i = 0; i < weekdays.length; i += 1) {
    const day = isoDate(weekdays[i]);
    const lessonCount = dailyLoads[i];

    for (let lessonIdx = 0; lessonIdx < lessonCount; lessonIdx += 1) {
      const [hour, minute] = timeSlots[lessonIdx];
      const start = utcDateTime(day, hour, minute);
      const end = utcDateTime(day, hour + 1, minute);
      const teacher = teacherPool[eventIndex % teacherPool.length];
      const student = students[eventIndex % students.length];
      const subject = teacher.teacherProfile?.subjects?.[0] ?? "Клубная деятельность";

      await createEventWithParticipants(
        {
          title: `LOADPACK Индивидуальное ${subject} ${student.user.fullName}`,
          subject,
          activityType: ActivityType.INDIVIDUAL_LESSON,
          status: EventStatus.PLANNED,
          plannedStartAt: start,
          plannedEndAt: end,
          plannedHours: 1,
          billableHours: 1,
          isPaid: true,
          createdByUserId: admin.id
        },
        [
          { userId: teacher.id, participantRole: ParticipantRole.TEACHER },
          { userId: student.user.id, participantRole: ParticipantRole.STUDENT }
        ]
      );

      eventIndex += 1;
    }
  }

  const clubTeachers = teacherPool.filter((item) =>
    (item.teacherProfile?.subjects ?? []).includes("Клубная деятельность")
  );
  const firstGroupTeachers = clubTeachers.length >= 2 ? clubTeachers.slice(0, 2) : teacherPool.slice(0, 2);
  const secondGroupTeachers = clubTeachers.length ? [clubTeachers[0]] : [teacherPool[0]];

  const groupPlan = [
    { day: isoDate(weekdays[1]), hour: 17, subject: "Клубная деятельность", teachers: firstGroupTeachers, studentStart: 0 },
    { day: isoDate(weekdays[3]), hour: 17, subject: "Клубная деятельность", teachers: secondGroupTeachers, studentStart: 4 }
  ];

  for (let i = 0; i < groupPlan.length; i += 1) {
    const plan = groupPlan[i];
    const start = utcDateTime(plan.day, plan.hour, 0);
    const end = utcDateTime(plan.day, plan.hour + 1, 0);
    const groupStudents = [
      students[plan.studentStart % students.length],
      students[(plan.studentStart + 1) % students.length],
      students[(plan.studentStart + 2) % students.length]
    ];

    await createEventWithParticipants(
      {
        title: `LOADPACK Групповое ${plan.subject} #${i + 1}`,
        subject: plan.subject,
        activityType: ActivityType.GROUP_LESSON,
        status: EventStatus.PLANNED,
        plannedStartAt: start,
        plannedEndAt: end,
        plannedHours: 1,
        billableHours: 1,
        isPaid: true,
        createdByUserId: admin.id
      },
      [
        ...plan.teachers.map((teacher) => ({ userId: teacher.id, participantRole: ParticipantRole.TEACHER })),
        ...groupStudents.map((student) => ({ userId: student.user.id, participantRole: ParticipantRole.STUDENT }))
      ]
    );
  }
}

async function main() {
  await ensureSubjectCatalog();
  const admin = await ensureAdmin();
  const parents = await ensureParents();
  const students = await ensureStudents();
  await ensureParentStudentLinks(parents, students);

  const pedagogues = await getPedagogues();
  await seedEvents(admin, pedagogues, students);

  console.log("Loadpack seed completed: 15 parents, 10 students, 20 events");
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
