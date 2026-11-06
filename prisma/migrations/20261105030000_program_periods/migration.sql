CREATE TABLE "ProgramPeriod" (
  "period" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ProgramPeriod_pkey" PRIMARY KEY ("period")
);
UPDATE "Program" SET "period" = replace("period", '-', '/');
INSERT INTO "ProgramPeriod" ("period", "updatedAt") SELECT DISTINCT "period", CURRENT_TIMESTAMP FROM "Program";
ALTER TABLE "Program" ADD CONSTRAINT "Program_period_fkey" FOREIGN KEY ("period") REFERENCES "ProgramPeriod"("period") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramPeriod" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProgramPeriod" FROM PUBLIC, anon, authenticated;
