-- AlterTable
ALTER TABLE "StudentProfile"
ADD COLUMN "comment" TEXT,
ADD COLUMN "iopDocxFileName" TEXT,
ADD COLUMN "iopDocxBase64" TEXT;

-- AlterTable
ALTER TABLE "ParentProfile"
ADD COLUMN "comment" TEXT;
