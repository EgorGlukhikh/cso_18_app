import { ActivityType } from "@prisma/client";

type EventForRule = {
  start: Date;
  end: Date;
  activityType: ActivityType;
};

const LESSON_TYPES = new Set<ActivityType>([
  ActivityType.INDIVIDUAL_LESSON,
  ActivityType.GROUP_LESSON
]);

function isLesson(type: ActivityType) {
  return LESSON_TYPES.has(type);
}

export function validateLessonParallelism(existing: EventForRule[], incoming: EventForRule) {
  if (!isLesson(incoming.activityType)) return null;

  const events = [...existing.filter((item) => isLesson(item.activityType)), incoming];
  const points: Array<{ ts: number; delta: 1 | -1; type: ActivityType }> = [];

  for (const event of events) {
    points.push({ ts: event.start.getTime(), delta: 1, type: event.activityType });
    points.push({ ts: event.end.getTime(), delta: -1, type: event.activityType });
  }

  points.sort((a, b) => (a.ts === b.ts ? a.delta - b.delta : a.ts - b.ts));

  let individual = 0;
  let group = 0;

  for (const point of points) {
    if (point.type === ActivityType.INDIVIDUAL_LESSON) {
      individual += point.delta;
    } else if (point.type === ActivityType.GROUP_LESSON) {
      group += point.delta;
    }

    const total = individual + group;
    if (total > 2) {
      return "В один временной слот допускается не более 2 учебных занятий";
    }
    if (group > 1) {
      return "В один слот допускается не более 1 группового занятия";
    }
    if (group >= 1 && individual >= 2) {
      return "Комбинация группового и индивидуальных превышает лимит слота";
    }
  }

  return null;
}

