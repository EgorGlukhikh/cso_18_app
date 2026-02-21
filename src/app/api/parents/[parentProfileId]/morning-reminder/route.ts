import { EventStatus, ParticipantRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { db } from "@/lib/db";
import { notFound, serverError } from "@/lib/http";

type Params = { params: Promise<{ parentProfileId: string }> };

export async function GET(request: NextRequest, context: Params) {
  try {
    const { parentProfileId } = await context.params;
    const parent = await db.parentProfile.findUnique({
      where: { id: parentProfileId },
      include: {
        user: true,
        studentLinks: {
          where: { receivesMorningReminder: true },
          include: { student: { include: { user: true } } }
        }
      }
    });

    if (!parent) return notFound("Parent not found");

    const dateString = new URL(request.url).searchParams.get("date");
    const baseDate = dateString ? new Date(`${dateString}T00:00:00.000Z`) : new Date();
    const from = startOfDay(baseDate);
    const to = endOfDay(baseDate);

    const studentUserIds = parent.studentLinks.map((link) => link.student.userId);

    const events = studentUserIds.length
      ? await db.event.findMany({
          where: {
            plannedStartAt: { gte: from, lte: to },
            status: { in: [EventStatus.PLANNED, EventStatus.COMPLETED] },
            participants: {
              some: {
                participantRole: ParticipantRole.STUDENT,
                userId: { in: studentUserIds }
              }
            }
          },
          include: {
            participants: {
              where: {
                participantRole: ParticipantRole.STUDENT,
                userId: { in: studentUserIds }
              },
              include: { user: true }
            }
          },
          orderBy: { plannedStartAt: "asc" }
        })
      : [];

    return NextResponse.json({
      parent: {
        id: parent.id,
        fullName: parent.user.fullName,
        telegramEnabled: parent.telegramEnabled,
        morningReminderHour: parent.morningReminderHour
      },
      date: from.toISOString().slice(0, 10),
      items: events.map((event) => ({
        eventId: event.id,
        title: event.title,
        startAt: event.plannedStartAt,
        endAt: event.plannedEndAt,
        students: event.participants.map((participant) => ({
          userId: participant.userId,
          fullName: participant.user.fullName
        }))
      }))
    });
  } catch (error) {
    return serverError(error);
  }
}

