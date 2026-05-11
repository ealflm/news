-- Rename Popup.cookieDays -> cookieTtlMinutes and backfill values (days × 1440).
ALTER TABLE "Popup" ADD COLUMN "cookieTtlMinutes" INTEGER NOT NULL DEFAULT 1440;
UPDATE "Popup" SET "cookieTtlMinutes" = GREATEST(1, "cookieDays") * 1440;
ALTER TABLE "Popup" DROP COLUMN "cookieDays";
