-- CreateEnum
CREATE TYPE "LinkPlatform" AS ENUM ('SHOPEE', 'TIKTOK', 'LAZADA', 'OTHER');

-- CreateEnum
CREATE TYPE "LinkDevice" AS ENUM ('IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK');

-- CreateEnum
CREATE TYPE "OverrideAction" AS ENUM ('ATTACH', 'DETACH');

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bannerUrl" TEXT NOT NULL,
    "delayMs" INTEGER NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cookieKey" TEXT NOT NULL,
    "cookieDays" INTEGER NOT NULL DEFAULT 1,
    "forceClickOnClose" BOOLEAN NOT NULL DEFAULT false,
    "hideOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "hideOnBot" BOOLEAN NOT NULL DEFAULT true,
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupLink" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "platform" "LinkPlatform" NOT NULL,
    "device" "LinkDevice" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "PopupLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostPopupOverride" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "action" "OverrideAction" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostPopupOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "postId" TEXT,
    "sessionId" TEXT,
    "device" TEXT,
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Popup_cookieKey_key" ON "Popup"("cookieKey");

-- CreateIndex
CREATE UNIQUE INDEX "PopupLink_popupId_platform_device_key" ON "PopupLink"("popupId", "platform", "device");

-- CreateIndex
CREATE UNIQUE INDEX "PostPopupOverride_postId_popupId_key" ON "PostPopupOverride"("postId", "popupId");

-- CreateIndex
CREATE INDEX "ClickEvent_popupId_createdAt_idx" ON "ClickEvent"("popupId", "createdAt");

-- CreateIndex
CREATE INDEX "ClickEvent_postId_createdAt_idx" ON "ClickEvent"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "PopupLink" ADD CONSTRAINT "PopupLink_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPopupOverride" ADD CONSTRAINT "PostPopupOverride_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPopupOverride" ADD CONSTRAINT "PostPopupOverride_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
