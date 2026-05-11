-- Drop UserInvite entirely (admins are created directly with username + password now)
DROP TABLE IF EXISTS "UserInvite";

-- Drop email column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
