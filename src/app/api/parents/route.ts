import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  telegramEnabled: z.boolean().default(false),
  morningReminderHour: z.number().int().min(0).max(23).default(8),
  comment: z.string().max(5000).optional()
});

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const items = await db.parentProfile.findMany({
      include: {
        user: true,
        studentLinks: {
          include: { student: { include: { user: true } } }
        }
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
    const email = payload.email.trim().toLowerCase();

    const created = await db.user.create({
      data: {
        email,
        fullName: payload.fullName,
        phone: payload.phone,
        role: UserRole.PARENT,
        timezone: "Europe/Moscow",
        parentProfile: {
          create: {
            telegramEnabled: payload.telegramEnabled,
            morningReminderHour: payload.morningReminderHour,
            comment: payload.comment
          }
        }
      },
      include: { parentProfile: true }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Некорректные данные", error.flatten());
    }
    return serverError(error);
  }
}
