-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'CURATOR', 'PSYCHOLOGIST', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LEISURE_GROUP', 'INDIVIDUAL_LESSON', 'GROUP_LESSON', 'OFFSITE_EVENT', 'PEDAGOGICAL_CONSILIUM', 'TEACHERS_GENERAL_MEETING', 'PSYCHOLOGIST_SESSION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('STUDENT', 'TEACHER', 'CURATOR', 'PSYCHOLOGIST', 'PARENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "googleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjects" TEXT[],
    "canBeCurator" BOOLEAN NOT NULL DEFAULT false,
    "paymentScheme" TEXT,
    "hourlyRateCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" TEXT,
    "diagnosticsSummary" TEXT,
    "problemSubjects" TEXT[],
    "requestText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramChatId" TEXT,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "morningReminderHour" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT,
    "receivesMorningReminder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStartAt" TIMESTAMP(3) NOT NULL,
    "plannedEndAt" TIMESTAMP(3) NOT NULL,
    "factStartAt" TIMESTAMP(3),
    "factEndAt" TIMESTAMP(3),
    "plannedHours" INTEGER NOT NULL DEFAULT 1,
    "billableHours" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "notes" TEXT,
    "cancelReasonId" TEXT,
    "cancelComment" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "participantRole" "ParticipantRole" NOT NULL,
    "attendanceStatus" "AttendanceStatus",
    "absenceReason" TEXT,
    "attendedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancelReason" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancelReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherRate" (
    "id" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_telegramChatId_key" ON "ParentProfile"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "Event_plannedStartAt_idx" ON "Event"("plannedStartAt");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_activityType_idx" ON "Event"("activityType");

-- CreateIndex
CREATE INDEX "EventParticipant_userId_participantRole_idx" ON "EventParticipant"("userId", "participantRole");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_userId_participantRole_key" ON "EventParticipant"("eventId", "userId", "participantRole");

-- CreateIndex
CREATE UNIQUE INDEX "CancelReason_code_key" ON "CancelReason"("code");

-- CreateIndex
CREATE INDEX "TeacherRate_teacherProfileId_activityType_effectiveFrom_idx" ON "TeacherRate"("teacherProfileId", "activityType", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cancelReasonId_fkey" FOREIGN KEY ("cancelReasonId") REFERENCES "CancelReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRate" ADD CONSTRAINT "TeacherRate_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

