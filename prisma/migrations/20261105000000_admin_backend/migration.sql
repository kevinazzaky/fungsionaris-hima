-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MemberGroup" AS ENUM ('pembina', 'pimpinan', 'sekretariat', 'bendahara', 'delegasi', 'hh', 'psdm', 'kominfo');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('web', 'spreadsheet');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "group" "MemberGroup" NOT NULL,
    "photoPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "angkatan" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "tempatTanggalLahir" TEXT NOT NULL DEFAULT '',
    "jenisKelamin" TEXT NOT NULL DEFAULT '',
    "alamat" TEXT NOT NULL DEFAULT '',
    "noHp" TEXT NOT NULL DEFAULT '',
    "idLine" TEXT NOT NULL DEFAULT '',
    "pengalamanOrganisasi" TEXT NOT NULL DEFAULT '',
    "minatSkill" TEXT NOT NULL DEFAULT '',
    "alasanBergabung" TEXT NOT NULL DEFAULT '',
    "divisi" TEXT NOT NULL,
    "alasanDivisi" TEXT NOT NULL DEFAULT '',
    "berkas" TEXT,
    "berkasPath" TEXT,
    "berkasSize" INTEGER,
    "source" "RegistrationSource" NOT NULL DEFAULT 'web',
    "submittedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_authId_key" ON "AdminUser"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Member_isPublished_group_sortOrder_idx" ON "Member"("isPublished", "group", "sortOrder");

-- CreateIndex
CREATE INDEX "GalleryPhoto_isPublished_sortOrder_idx" ON "GalleryPhoto"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "Registration_period_submittedAt_idx" ON "Registration"("period", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_nim_period_key" ON "Registration"("nim", "period");

-- Prisma mengakses tabel dari server; Data API Supabase tidak diberi akses langsung.
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminUser", "Member", "GalleryPhoto", "Registration" FROM PUBLIC, anon, authenticated;
