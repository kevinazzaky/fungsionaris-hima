CREATE TYPE "ProgramRegistrationMode" AS ENUM ('external', 'internal');

ALTER TABLE "Program"
  ADD COLUMN "registrationMode" "ProgramRegistrationMode" NOT NULL DEFAULT 'external',
  ADD COLUMN "registrationGroupLink" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "registrationMaxQuota" INTEGER,
  ADD CONSTRAINT "Program_registrationMaxQuota_check" CHECK ("registrationMaxQuota" IS NULL OR "registrationMaxQuota" >= 1);

CREATE TABLE "ProgramRegistration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "programId" UUID NOT NULL,
  "nama" TEXT NOT NULL,
  "nim" TEXT NOT NULL,
  "angkatan" TEXT NOT NULL,
  "noHp" TEXT NOT NULL DEFAULT '',
  "idLine" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "catatan" TEXT NOT NULL DEFAULT '',
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProgramRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramRegistration_programId_nim_key" ON "ProgramRegistration"("programId", "nim");
CREATE INDEX "ProgramRegistration_programId_submittedAt_idx" ON "ProgramRegistration"("programId", "submittedAt");

ALTER TABLE "ProgramRegistration"
  ADD CONSTRAINT "ProgramRegistration_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProgramRegistration" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProgramRegistration" FROM anon, authenticated, PUBLIC;
