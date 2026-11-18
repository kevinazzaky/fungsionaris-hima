ALTER TABLE "Program" ADD COLUMN "registrationFormConfig" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "ProgramRegistration" ADD COLUMN "customResponses" JSONB NOT NULL DEFAULT '{}'::jsonb;
