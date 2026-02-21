import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/http";
import { requireAdminUser } from "@/lib/require-admin";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  sortOrder: z.number().int().min(0).max(1000).optional()
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";
    const items = await db.subject.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
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

    const payload = createSchema.parse(await request.json());
    const name = payload.name.trim();

    const created = await db.subject.create({
      data: {
        name,
        sortOrder: payload.sortOrder ?? 100
      }
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest("Некорректные данные", error.flatten());
    return serverError(error);
  }
}
