import { ParticipantRole } from "@prisma/client";
import { db } from "@/lib/db";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram";

function formatEventStart(startAt: Date) {
  return {
    date: startAt.toLocaleDateString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }),
    time: startAt.toLocaleTimeString("ru-RU", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

function messageForParent(params: {
  studentFullName: string;
  subject: string;
  teacherNames: string;
  date: string;
  time: string;
}) {
  return [
    `Вашему ребенку ${params.studentFullName} назначено занятие по предмету ${params.subject} с педагогом ${params.teacherNames}.`,
    `Дата занятия: ${params.date}`,
    `Время занятия: ${params.time}`,
    "",
    "Если ваш ребенок не сможет посетить занятие, напишите в бота."
  ].join("\n");
}

export async function notifyParentsAboutCreatedEvent(eventId: string) {
  if (!isTelegramConfigured()) return;

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }
    }
  });

  if (!event) return;

  const studentParticipants = event.participants.filter(
    (item) => item.participantRole === ParticipantRole.STUDENT
  );
  if (!studentParticipants.length) return;

  const teacherNames = event.participants
    .filter((item) =>
      item.participantRole === ParticipantRole.TEACHER ||
      item.participantRole === ParticipantRole.CURATOR ||
      item.participantRole === ParticipantRole.PSYCHOLOGIST
    )
    .map((item) => item.user.fullName)
    .join(", ") || "не указан";

  const links = await db.parentStudentLink.findMany({
    where: {
      student: {
        userId: { in: studentParticipants.map((item) => item.userId) }
      },
      parent: {
        telegramEnabled: true,
        telegramChatId: { not: null }
      }
    },
    include: {
      parent: true,
      student: {
        include: {
          user: {
            select: {
              fullName: true
            }
          }
        }
      }
    }
  });

  if (!links.length) return;

  const { date, time } = formatEventStart(event.plannedStartAt);
  const subject = (event.subject ?? "").trim() || event.title;

  await Promise.allSettled(
    links.map(async (link) => {
      if (!link.parent.telegramChatId) return;
      const text = messageForParent({
        studentFullName: link.student.user.fullName,
        subject,
        teacherNames,
        date,
        time
      });
      await sendTelegramMessage(link.parent.telegramChatId, text);
    })
  );
}

