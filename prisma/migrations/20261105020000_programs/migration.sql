CREATE TYPE "ProgramStatus" AS ENUM ('upcoming','open','closed');
CREATE TABLE "Program" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "fullDescription" TEXT NOT NULL DEFAULT '',
  "period" TEXT NOT NULL, "executionDate" TEXT NOT NULL DEFAULT '', "time" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL DEFAULT '',
  "status" "ProgramStatus" NOT NULL DEFAULT 'upcoming', "icon" TEXT NOT NULL DEFAULT 'code', "gformLink" TEXT NOT NULL DEFAULT '',
  "speakers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "price" TEXT NOT NULL DEFAULT '', "contactPerson" TEXT NOT NULL DEFAULT '', "imagePath" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Program_isPublished_period_sortOrder_idx" ON "Program"("isPublished","period","sortOrder");
ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Program" FROM PUBLIC, anon, authenticated;
