import { EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serverError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {
      status: EventStatus.CANCELED,
      ...(from || to
        ? {
            plannedStartAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
            }
          }
        : {})
    };

    const rows = await db.event.groupBy({
      by: ["cancelReasonId"],
      where,
      _count: { _all: true }
    });

    const reasons = await db.cancelReason.findMany({
      where: { id: { in: rows.map((item) => item.cancelReasonId).filter(Boolean) as string[] } },
      select: { id: true, name: true }
    });

    const reasonMap = new Map(reasons.map((item) => [item.id, item.name]));

    return NextResponse.json({
      items: rows
        .map((item) => ({
          reasonId: item.cancelReasonId,
          reasonName: item.cancelReasonId ? reasonMap.get(item.cancelReasonId) ?? "Не указано" : "Не указано",
          count: item._count._all
        }))
        .sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    return serverError(error);
  }
}

