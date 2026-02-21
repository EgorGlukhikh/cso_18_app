-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE', 'DISMISSED');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "curatorTeacherId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "completionComment" TEXT;

-- CreateTable
CREATE TABLE "TeacherStudentLink" (
    "id" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventConfirmationTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "EventConfirmationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherStudentLink_teacherProfileId_studentProfileId_key" ON "TeacherStudentLink"("teacherProfileId", "studentProfileId");

-- CreateIndex
CREATE INDEX "TeacherStudentLink_teacherProfileId_idx" ON "TeacherStudentLink"("teacherProfileId");

-- CreateIndex
CREATE INDEX "TeacherStudentLink_studentProfileId_idx" ON "TeacherStudentLink"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfirmationTask_eventId_teacherUserId_key" ON "EventConfirmationTask"("eventId", "teacherUserId");

-- CreateIndex
CREATE INDEX "EventConfirmationTask_teacherUserId_status_idx" ON "EventConfirmationTask"("teacherUserId", "status");

-- CreateIndex
CREATE INDEX "StudentProfile_curatorTeacherId_idx" ON "StudentProfile"("curatorTeacherId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_curatorTeacherId_fkey" FOREIGN KEY ("curatorTeacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentLink" ADD CONSTRAINT "TeacherStudentLink_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentLink" ADD CONSTRAINT "TeacherStudentLink_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventConfirmationTask" ADD CONSTRAINT "EventConfirmationTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventConfirmationTask" ADD CONSTRAINT "EventConfirmationTask_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
