import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const patchSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().optional(),
  grade: z.string().optional(),
  diagnosticsSummary: z.string().optional(),
  problemSubjects: z.array(z.string()).optional(),
  requestText: z.string().optional(),
  comment: z.string().max(5000).optional(),
  curatorTeacherId: z.string().nullable().optional(),
  iopDocxFileName: z.string().max(255).optional(),
  iopDocxBase64: z.string().max(2_000_000).optional()
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { id } = await context.params;
    const student = await db.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        curatorTeacher: { include: { user: true } }
      }
    });
    if (!student) return notFound("Студент не найден");
    return NextResponse.json(student);
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

    const existing = await db.studentProfile.findUnique({ where: { id }, include: { user: true } });
    if (!existing) return notFound("Студент не найден");

    if (payload.fullName !== undefined || payload.phone !== undefined) {
      await db.user.update({
        where: { id: existing.userId },
        data: {
          ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone } : {})
        }
      });
    }

    const updated = await db.studentProfile.update({
      where: { id },
      data: {
        ...(payload.grade !== undefined ? { grade: payload.grade } : {}),
        ...(payload.diagnosticsSummary !== undefined ? { diagnosticsSummary: payload.diagnosticsSummary } : {}),
        ...(payload.problemSubjects !== undefined ? { problemSubjects: payload.problemSubjects } : {}),
        ...(payload.requestText !== undefined ? { requestText: payload.requestText } : {}),
        ...(payload.comment !== undefined ? { comment: payload.comment } : {}),
        ...(payload.curatorTeacherId !== undefined ? { curatorTeacherId: payload.curatorTeacherId } : {}),
        ...(payload.iopDocxFileName !== undefined ? { iopDocxFileName: payload.iopDocxFileName } : {}),
        ...(payload.iopDocxBase64 !== undefined ? { iopDocxBase64: payload.iopDocxBase64 } : {})
      },
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        curatorTeacher: { include: { user: true } }
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest("Некорректные данные", error.flatten());
    return serverError(error);
  }
}
