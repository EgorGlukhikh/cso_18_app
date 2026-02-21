import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional()
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { id } = await context.params;
    const payload = patchSchema.parse(await request.json());

    const existing = await db.subject.findUnique({ where: { id } });
    if (!existing) return notFound("Предмет не найден");

    const updated = await db.subject.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {})
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest("Некорректные данные", error.flatten());
    return serverError(error);
  }
}
