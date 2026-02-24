import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const patchSchema = z.object({
  fullName: z.string().min(3).optional(),
  phone: z.string().optional(),
  telegramChatId: z.string().trim().min(1).nullable().optional(),
  telegramEnabled: z.boolean().optional(),
  morningReminderHour: z.number().int().min(0).max(23).optional(),
  comment: z.string().max(5000).optional()
});

type Params = { params: Promise<{ parentProfileId: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { parentProfileId } = await context.params;
    const parent = await db.parentProfile.findUnique({
      where: { id: parentProfileId },
      include: {
        user: true,
        studentLinks: { include: { student: { include: { user: true } } } }
      }
    });
    if (!parent) return notFound("Родитель не найден");
    return NextResponse.json(parent);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { parentProfileId } = await context.params;
    const payload = patchSchema.parse(await request.json());

    const existing = await db.parentProfile.findUnique({ where: { id: parentProfileId }, include: { user: true } });
    if (!existing) return notFound("Родитель не найден");

    if (payload.fullName !== undefined || payload.phone !== undefined) {
      await db.user.update({
        where: { id: existing.userId },
        data: {
          ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone } : {})
        }
      });
    }

    const updated = await db.parentProfile.update({
      where: { id: parentProfileId },
      data: {
        ...(payload.telegramChatId !== undefined ? { telegramChatId: payload.telegramChatId } : {}),
        ...(payload.telegramEnabled !== undefined ? { telegramEnabled: payload.telegramEnabled } : {}),
        ...(payload.morningReminderHour !== undefined ? { morningReminderHour: payload.morningReminderHour } : {}),
        ...(payload.comment !== undefined ? { comment: payload.comment } : {})
      },
      include: {
        user: true,
        studentLinks: { include: { student: { include: { user: true } } } }
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest("Некорректные данные", error.flatten());
    return serverError(error);
  }
}
