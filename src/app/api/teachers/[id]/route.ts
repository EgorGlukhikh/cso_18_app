import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const patchSchema = z.object({
  subjects: z.array(z.string().min(1)).optional(),
  canBeCurator: z.boolean().optional(),
  hourlyRateCents: z.number().int().min(0).nullable().optional()
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { id } = await context.params;
    const teacher = await db.teacherProfile.findUnique({
      where: { id },
      include: { user: true, studentLinks: { include: { student: { include: { user: true } } } } }
    });
    if (!teacher) return notFound("Преподаватель не найден");
    return NextResponse.json(teacher);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { id } = await context.params;
    const payload = patchSchema.parse(await request.json());
    if (payload.subjects?.length) {
      const validSubjects = await db.subject.findMany({
        where: { name: { in: payload.subjects }, isActive: true },
        select: { name: true }
      });
      if (validSubjects.length !== payload.subjects.length) {
        return badRequest("Один или несколько предметов отсутствуют в справочнике");
      }
    }

    const existing = await db.teacherProfile.findUnique({ where: { id } });
    if (!existing) return notFound("Преподаватель не найден");

    const updated = await db.teacherProfile.update({
      where: { id },
      data: {
        ...(payload.subjects ? { subjects: payload.subjects } : {}),
        ...(payload.canBeCurator !== undefined ? { canBeCurator: payload.canBeCurator } : {}),
        ...(payload.hourlyRateCents !== undefined ? { hourlyRateCents: payload.hourlyRateCents } : {})
      },
      include: { user: true, studentLinks: { include: { student: { include: { user: true } } } } }
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest("Некорректные данные", error.flatten());
    return serverError(error);
  }
}
