import { ActivityType, EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { computeBillableHours } from "@/lib/hours";
import { badRequest, serverError } from "@/lib/http";
import { validateLessonParallelism } from "@/lib/schedule-rules";
import { eventCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status") as EventStatus | null;

    const where = {
      ...(from || to
        ? {
            plannedStartAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
            }
          }
        : {}),
      ...(status ? { status } : {})
    };

    const items = await db.event.findMany({
      where,
      include: {
        cancelReason: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { plannedStartAt: "asc" }
    });

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}

function isLessonType(type: ActivityType) {
  return type === ActivityType.INDIVIDUAL_LESSON || type === ActivityType.GROUP_LESSON;
}

function isAdministrativeType(type: ActivityType) {
  return (
    type === ActivityType.OFFSITE_EVENT ||
    type === ActivityType.PEDAGOGICAL_CONSILIUM ||
    type === ActivityType.TEACHERS_GENERAL_MEETING ||
    type === ActivityType.PSYCHOLOGIST_SESSION
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = eventCreateSchema.parse(body);

    if (payload.subject) {
      const subjectExists = await db.subject.findFirst({
        where: { name: payload.subject, isActive: true },
        select: { id: true }
      });
      if (!subjectExists) {
        return badRequest("Выбранный предмет отсутствует в активном справочнике");
      }
    }

    if (
      isAdministrativeType(payload.activityType) &&
      payload.participants.some((item) => item.participantRole === "STUDENT")
    ) {
      return badRequest("Для студентов нельзя создавать административные занятия");
    }

    if (isLessonType(payload.activityType)) {
      const overlapping = await db.event.findMany({
        where: {
          status: { in: [EventStatus.PLANNED, EventStatus.COMPLETED] },
          plannedStartAt: { lt: payload.plannedEndAt },
          plannedEndAt: { gt: payload.plannedStartAt },
          activityType: { in: [ActivityType.INDIVIDUAL_LESSON, ActivityType.GROUP_LESSON] }
        },
        select: {
          plannedStartAt: true,
          plannedEndAt: true,
          activityType: true
        }
      });

      const conflict = validateLessonParallelism(
        overlapping.map((item) => ({
          start: item.plannedStartAt,
          end: item.plannedEndAt,
          activityType: item.activityType
        })),
        {
          start: payload.plannedStartAt,
          end: payload.plannedEndAt,
          activityType: payload.activityType
        }
      );

      if (conflict) {
        return badRequest(conflict);
      }
    }

    const event = await db.event.create({
      data: {
        title: payload.title,
        subject: payload.subject,
        activityType: payload.activityType,
        plannedStartAt: payload.plannedStartAt,
        plannedEndAt: payload.plannedEndAt,
        plannedHours: payload.plannedHours,
        billableHours: computeBillableHours(EventStatus.PLANNED, payload.plannedHours),
        status: EventStatus.PLANNED,
        isPaid: true,
        location: payload.location,
        notes: payload.notes,
        createdByUserId: payload.createdByUserId,
        participants: payload.participants.length
          ? {
              create: payload.participants
            }
          : undefined
      },
      include: {
        participants: true
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten());
    }
    return serverError(error);
  }
}
