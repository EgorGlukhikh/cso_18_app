import { EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serverError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = from || to
      ? {
          plannedStartAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
          }
        }
      : {};

    const events = await db.event.findMany({
      where,
      select: { status: true, plannedHours: true, billableHours: true }
    });

    const planned = events.length;
    const completed = events.filter((item) => item.status === EventStatus.COMPLETED);
    const canceled = events.filter((item) => item.status === EventStatus.CANCELED);

    const plannedHours = events.reduce((sum, item) => sum + item.plannedHours, 0);
    const factualHours = completed.reduce((sum, item) => sum + item.plannedHours, 0);
    const billableHours = completed.reduce((sum, item) => sum + item.billableHours, 0);

    const attendanceRate = planned ? Number(((completed.length / planned) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      period: { from, to },
      eventCounts: {
        total: planned,
        planned: events.filter((item) => item.status === EventStatus.PLANNED).length,
        completed: completed.length,
        canceled: canceled.length
      },
      hours: {
        planned: plannedHours,
        factual: factualHours,
        billable: billableHours
      },
      conversion: {
        attendanceRate
      }
    });
  } catch (error) {
    return serverError(error);
  }
}

