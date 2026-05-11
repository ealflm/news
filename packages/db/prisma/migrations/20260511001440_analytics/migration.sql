-- CreateTable
CREATE TABLE "ViewEvent" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "device" TEXT,
    "inFbApp" BOOLEAN NOT NULL DEFAULT false,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostStatDaily" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostStatDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupStatDaily" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "shown" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PopupStatDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewEvent_postId_createdAt_idx" ON "ViewEvent"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ViewEvent_createdAt_idx" ON "ViewEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PostStatDaily_day_idx" ON "PostStatDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PostStatDaily_postId_day_key" ON "PostStatDaily"("postId", "day");

-- CreateIndex
CREATE INDEX "PopupStatDaily_day_idx" ON "PopupStatDaily"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PopupStatDaily_popupId_day_key" ON "PopupStatDaily"("popupId", "day");

-- AddForeignKey
ALTER TABLE "ViewEvent" ADD CONSTRAINT "ViewEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
