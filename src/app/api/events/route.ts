import { EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { computeBillableHours } from "@/lib/hours";
import { badRequest, serverError } from "@/lib/http";
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
        cancelReason: true
      },
      orderBy: { plannedStartAt: "asc" }
    });

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = eventCreateSchema.parse(body);

    const event = await db.event.create({
      data: {
        title: payload.title,
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

