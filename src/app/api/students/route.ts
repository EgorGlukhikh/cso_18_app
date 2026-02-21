import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  grade: z.string().optional(),
  diagnosticsSummary: z.string().optional(),
  problemSubjects: z.array(z.string()).default([]),
  requestText: z.string().optional()
});

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const items = await db.studentProfile.findMany({
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        curatorTeacher: { include: { user: true } }
      },
      orderBy: { user: { fullName: "asc" } }
    });
    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const payload = schema.parse(await request.json());
    const email = payload.email?.trim().toLowerCase();

    const created = await db.user.create({
      data: {
        email,
        fullName: payload.fullName,
        phone: payload.phone,
        role: UserRole.STUDENT,
        timezone: "Europe/Moscow",
        studentProfile: {
          create: {
            grade: payload.grade,
            diagnosticsSummary: payload.diagnosticsSummary,
            problemSubjects: payload.problemSubjects,
            requestText: payload.requestText
          }
        }
      },
      include: { studentProfile: true }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Некорректные данные", error.flatten());
    }
    return serverError(error);
  }
}
