import { ParticipantRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/http";
import { eventUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const event = await db.event.findUnique({
      where: { id },
      include: {
        participants: { include: { user: true } },
        cancelReason: true
      }
    });
    if (!event) return notFound("Event not found");
    return NextResponse.json(event);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = eventUpdateSchema.parse(body);

    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) return notFound("Event not found");

    const event = await db.event.update({
      where: { id },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.activityType ? { activityType: payload.activityType } : {}),
        ...(payload.plannedStartAt ? { plannedStartAt: payload.plannedStartAt } : {}),
        ...(payload.plannedEndAt ? { plannedEndAt: payload.plannedEndAt } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.plannedHours ? { plannedHours: payload.plannedHours } : {})
      }
    });

    if (payload.participants) {
      const participants = payload.participants as Array<{
        userId: string;
        participantRole: ParticipantRole;
      }>;

      await db.eventParticipant.deleteMany({ where: { eventId: id } });
      if (participants.length) {
        await db.eventParticipant.createMany({
          data: participants.map((item) => ({
            eventId: id,
            userId: item.userId,
            participantRole: item.participantRole
          }))
        });
      }
    }

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten());
    }
    return serverError(error);
  }
}
