import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { badRequest, serverError } from "@/lib/http";

const createLinkSchema = z.object({
  parentProfileId: z.string().min(1),
  studentProfileId: z.string().min(1),
  relationship: z.string().trim().max(100).optional(),
  receivesMorningReminder: z.boolean().default(true)
});

const updateLinkSchema = z.object({
  linkId: z.string().min(1),
  receivesMorningReminder: z.boolean(),
  relationship: z.string().trim().max(100).optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentProfileId = searchParams.get("studentProfileId");
    if (!studentProfileId) return badRequest("studentProfileId is required");

    const items = await db.parentStudentLink.findMany({
      where: { studentId: studentProfileId },
      include: {
        parent: { include: { user: true } },
        student: { include: { user: true } }
      }
    });

    return NextResponse.json({ items });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createLinkSchema.parse(body);

    const currentCount = await db.parentStudentLink.count({
      where: { studentId: payload.studentProfileId }
    });
    if (currentCount >= 2) {
      return badRequest("У ребенка может быть не более 2 родителей");
    }

    const created = await db.parentStudentLink.create({
      data: {
        parentId: payload.parentProfileId,
        studentId: payload.studentProfileId,
        relationship: payload.relationship,
        receivesMorningReminder: payload.receivesMorningReminder
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten());
    }
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = updateLinkSchema.parse(body);

    const updated = await db.parentStudentLink.update({
      where: { id: payload.linkId },
      data: {
        receivesMorningReminder: payload.receivesMorningReminder,
        ...(payload.relationship !== undefined ? { relationship: payload.relationship } : {})
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed", error.flatten());
    }
    return serverError(error);
  }
}

