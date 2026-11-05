CREATE TABLE "RegistrationSettings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RegistrationSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistrationSettings_singleton" CHECK ("id" = 'main')
);
INSERT INTO "RegistrationSettings" ("id", "isOpen", "updatedAt") VALUES ('main', true, CURRENT_TIMESTAMP);
ALTER TABLE "RegistrationSettings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RegistrationSettings" FROM PUBLIC, anon, authenticated;
