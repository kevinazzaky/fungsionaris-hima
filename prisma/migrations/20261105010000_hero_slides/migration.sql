CREATE TABLE "HeroSlide" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HeroSlide_isPublished_sortOrder_idx" ON "HeroSlide"("isPublished", "sortOrder");
ALTER TABLE "HeroSlide" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "HeroSlide" FROM PUBLIC, anon, authenticated;
