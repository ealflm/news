-- Add username column (nullable for backfill)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill username from email local-part for existing users.
-- Use id suffix to guarantee uniqueness if multiple users share a local-part.
UPDATE "User"
SET "username" = split_part("email", '@', 1) || '_' || substr("id", 1, 6)
WHERE "username" IS NULL;

-- Now require + index username
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Make email optional (login no longer requires it)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
