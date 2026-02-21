import { ActivityType, EventStatus, ParticipantRole } from "@prisma/client";
import { z } from "zod";
import { computeDefaultPlannedHours } from "./hours";

const isoDate = z.string().datetime({ offset: true });

const participantSchema = z.object({
  userId: z.string().min(1),
  participantRole: z.nativeEnum(ParticipantRole)
});

const eventBaseSchema = z.object({
  title: z.string().min(1),
  subject: z.string().trim().max(255).optional(),
  activityType: z.nativeEnum(ActivityType),
  plannedStartAt: isoDate,
  plannedEndAt: isoDate,
  plannedHours: z.number().int().min(1).max(12).optional(),
  location: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().max(4000).optional(),
  createdByUserId: z.string().min(1),
  participants: z.array(participantSchema).default([])
});

export const eventCreateSchema = eventBaseSchema
  .superRefine((value, ctx) => {
    const start = new Date(value.plannedStartAt);
    const end = new Date(value.plannedEndAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
      return;
    }
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plannedEndAt"],
        message: "End must be later than start"
      });
    }
  })
  .transform((value) => {
    const start = new Date(value.plannedStartAt);
    const end = new Date(value.plannedEndAt);
    return {
      ...value,
      plannedStartAt: start,
      plannedEndAt: end,
      plannedHours: value.plannedHours ?? computeDefaultPlannedHours(start, end)
    };
  });

export const eventUpdateSchema = eventBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (value.plannedStartAt && value.plannedEndAt) {
      const start = new Date(value.plannedStartAt);
      const end = new Date(value.plannedEndAt);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["plannedEndAt"],
          message: "End must be later than start"
        });
      }
    }
  })
  .transform((value) => ({
    ...value,
    plannedStartAt: value.plannedStartAt ? new Date(value.plannedStartAt) : undefined,
    plannedEndAt: value.plannedEndAt ? new Date(value.plannedEndAt) : undefined
  }));

export const eventStatusSchema = z
  .object({
    status: z.nativeEnum(EventStatus),
    cancelReasonId: z.string().min(1).optional(),
    cancelComment: z.string().trim().max(1000).optional(),
    factStartAt: isoDate.optional(),
    factEndAt: isoDate.optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === EventStatus.CANCELED && !value.cancelReasonId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelReasonId"],
        message: "Cancel reason is required for canceled status"
      });
    }
  })
  .transform((value) => ({
    ...value,
    factStartAt: value.factStartAt ? new Date(value.factStartAt) : undefined,
    factEndAt: value.factEndAt ? new Date(value.factEndAt) : undefined
  }));
