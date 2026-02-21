import { EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { computeBillableHours } from "@/lib/hours";
import { badRequest, notFound, serverError } from "@/lib/http";
import { eventStatusSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = eventStatusSchema.parse(body);

    const event = await db.event.findUnique({
      where: { id },
      include: { cancelReason: true }
    });
    if (!event) return notFound("Event not found");

    if (payload.status === EventStatus.CANCELED) {
      const reason = await db.cancelReason.findUnique({
        where: { id: payload.cancelReasonId }
      });
      if (!reason) return badRequest("Причина отмены не найдена");
    }

    const updated = await db.event.update({
      where: { id },
      data: {
        status: payload.status,
        cancelReasonId: payload.status === EventStatus.CANCELED ? payload.cancelReasonId : null,
        cancelComment: payload.status === EventStatus.CANCELED ? payload.cancelComment ?? null : null,
        completionComment:
          payload.status === EventStatus.COMPLETED ? payload.completionComment?.trim() ?? null : null,
        factStartAt: payload.status === EventStatus.COMPLETED ? payload.factStartAt ?? event.plannedStartAt : null,
        factEndAt: payload.status === EventStatus.COMPLETED ? payload.factEndAt ?? event.plannedEndAt : null,
        billableHours: computeBillableHours(payload.status, event.plannedHours)
      },
      include: { cancelReason: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten());
    }
    return serverError(error);
  }
}
