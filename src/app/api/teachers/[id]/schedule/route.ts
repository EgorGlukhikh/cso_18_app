import { ActivityType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

type Params = { params: Promise<{ id: string }> };

function toCategory(type: ActivityType) {
  if (type === "INDIVIDUAL_LESSON") return "individual";
  if (type === "GROUP_LESSON" || type === "LEISURE_GROUP") return "group";
  return "administrative";
}

export async function GET(request: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { id } = await context.params;
    const teacher = await db.teacherProfile.findUnique({ where: { id }, include: { user: true } });
    if (!teacher) return notFound("Преподаватель не найден");

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const rangeFrom = from ? new Date(`${from}T00:00:00.000Z`) : defaultFrom;
    const rangeTo = to ? new Date(`${to}T23:59:59.999Z`) : defaultTo;

    const events = await db.event.findMany({
      where: {
        plannedStartAt: { gte: rangeFrom, lte: rangeTo },
        participants: {
          some: { userId: teacher.userId, participantRole: { in: ["TEACHER", "CURATOR"] } }
        }
      },
      orderBy: { plannedStartAt: "asc" },
      select: {
        id: true,
        title: true,
        activityType: true,
        plannedStartAt: true,
        plannedEndAt: true,
        status: true
      }
    });

    const items = events.map((event) => ({
      ...event,
      category: toCategory(event.activityType)
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}
