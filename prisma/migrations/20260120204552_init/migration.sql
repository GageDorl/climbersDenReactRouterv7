-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('new_message', 'post_liked', 'new_follower', 'gear_claimed', 'all_gear_claimed');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('post', 'message', 'user', 'gear_list');

-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('post', 'message', 'user');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'action_taken', 'dismissed');

-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('sport', 'trad', 'boulder', 'mixed');

-- CreateEnum
CREATE TYPE "SendStyle" AS ENUM ('redpoint', 'flash', 'onsight', 'project', 'toprope', 'follow');

-- CreateEnum
CREATE TYPE "ClimbingSuitability" AS ENUM ('good', 'fair', 'poor');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('synced', 'pending', 'conflict');

-- CreateEnum
CREATE TYPE "SubmissionEntityType" AS ENUM ('crag', 'route');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "profilePhotoUrl" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationCity" TEXT,
    "locationPermissionGranted" BOOLEAN NOT NULL DEFAULT false,
    "lastLocationUpdate" TIMESTAMP(3),
    "climbingStyles" TEXT[],
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "textContent" TEXT,
    "mediaUrls" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "participantIds" TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "textContent" TEXT,
    "mediaUrls" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "content" JSONB NOT NULL,
    "relatedEntityId" TEXT,
    "relatedEntityType" "EntityType",
    "readStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedEntityType" "ReportEntityType" NOT NULL,
    "reportedEntityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_chats" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "participantIds" TEXT[],
    "name" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_messages" (
    "id" TEXT NOT NULL,
    "groupChatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "textContent" TEXT,
    "mediaUrls" TEXT[],
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "description" TEXT,
    "elevation" INTEGER,
    "approachDescription" TEXT,
    "totalRouteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "cragId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RouteType" NOT NULL,
    "grade" TEXT NOT NULL,
    "pitchCount" INTEGER NOT NULL DEFAULT 1,
    "length" INTEGER,
    "description" TEXT,
    "averageRating" DECIMAL(2,1),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sendStyle" "SendStyle" NOT NULL,
    "attempts" INTEGER,
    "personalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_ratings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "starRating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_crags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cragId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_crags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_forecasts" (
    "id" TEXT NOT NULL,
    "cragId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "temperatureHigh" INTEGER NOT NULL,
    "temperatureLow" INTEGER NOT NULL,
    "precipitationChance" INTEGER NOT NULL,
    "windSpeed" INTEGER NOT NULL,
    "conditionSummary" TEXT NOT NULL,
    "climbingSuitability" "ClimbingSuitability" NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "tags" TEXT[],
    "location" TEXT,
    "mediaUrls" TEXT[],
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'synced',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_lists" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tripDate" TIMESTAMP(3),
    "participantIds" TEXT[],
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_items" (
    "id" TEXT NOT NULL,
    "gearListId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantityNeeded" INTEGER NOT NULL,
    "quantityClaimed" INTEGER NOT NULL DEFAULT 0,
    "claimedByUserIds" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crag_submissions" (
    "id" TEXT NOT NULL,
    "submitterUserId" TEXT NOT NULL,
    "entityType" "SubmissionEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "parentCragId" TEXT,
    "details" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "crag_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_displayName_idx" ON "users"("displayName");

-- CreateIndex
CREATE INDEX "users_locationCity_idx" ON "users"("locationCity");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_lastLocationUpdate_idx" ON "users"("lastLocationUpdate");

-- CreateIndex
CREATE INDEX "posts_userId_createdAt_idx" ON "posts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_likeCount_idx" ON "posts"("likeCount" DESC);

-- CreateIndex
CREATE INDEX "likes_postId_idx" ON "likes"("postId");

-- CreateIndex
CREATE INDEX "likes_userId_idx" ON "likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_postId_key" ON "likes"("userId", "postId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "messages_conversationId_sentAt_idx" ON "messages"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_readAt_idx" ON "messages"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "follows_followedId_idx" ON "follows"("followedId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followedId_key" ON "follows"("followerId", "followedId");

-- CreateIndex
CREATE INDEX "notifications_userId_readStatus_createdAt_idx" ON "notifications"("userId", "readStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reports_reportedEntityType_reportedEntityId_idx" ON "reports"("reportedEntityType", "reportedEntityId");

-- CreateIndex
CREATE INDEX "blocks_blockedUserId_idx" ON "blocks"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerUserId_blockedUserId_key" ON "blocks"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "group_chats_lastMessageAt_idx" ON "group_chats"("lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "group_messages_groupChatId_sentAt_idx" ON "group_messages"("groupChatId", "sentAt");

-- CreateIndex
CREATE INDEX "crags_name_idx" ON "crags"("name");

-- CreateIndex
CREATE INDEX "crags_totalRouteCount_idx" ON "crags"("totalRouteCount" DESC);

-- CreateIndex
CREATE INDEX "routes_cragId_grade_idx" ON "routes"("cragId", "grade");

-- CreateIndex
CREATE INDEX "routes_name_idx" ON "routes"("name");

-- CreateIndex
CREATE INDEX "routes_type_idx" ON "routes"("type");

-- CreateIndex
CREATE INDEX "routes_averageRating_idx" ON "routes"("averageRating" DESC);

-- CreateIndex
CREATE INDEX "ticks_userId_date_idx" ON "ticks"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX "ticks_routeId_idx" ON "ticks"("routeId");

-- CreateIndex
CREATE INDEX "ticks_userId_routeId_idx" ON "ticks"("userId", "routeId");

-- CreateIndex
CREATE INDEX "route_ratings_routeId_idx" ON "route_ratings"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "route_ratings_userId_routeId_key" ON "route_ratings"("userId", "routeId");

-- CreateIndex
CREATE INDEX "favorite_crags_userId_createdAt_idx" ON "favorite_crags"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "favorite_crags_userId_cragId_key" ON "favorite_crags"("userId", "cragId");

-- CreateIndex
CREATE INDEX "weather_forecasts_fetchedAt_idx" ON "weather_forecasts"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "weather_forecasts_cragId_forecastDate_key" ON "weather_forecasts"("cragId", "forecastDate");

-- CreateIndex
CREATE INDEX "journals_userId_createdAt_idx" ON "journals"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "journals_syncStatus_userId_idx" ON "journals"("syncStatus", "userId");

-- CreateIndex
CREATE INDEX "gear_lists_creatorId_archived_tripDate_idx" ON "gear_lists"("creatorId", "archived", "tripDate");

-- CreateIndex
CREATE INDEX "gear_items_gearListId_idx" ON "gear_items"("gearListId");

-- CreateIndex
CREATE INDEX "crag_submissions_status_submittedAt_idx" ON "crag_submissions"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "crag_submissions_submitterUserId_idx" ON "crag_submissions"("submitterUserId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_chats" ADD CONSTRAINT "group_chats_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "group_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_cragId_fkey" FOREIGN KEY ("cragId") REFERENCES "crags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticks" ADD CONSTRAINT "ticks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticks" ADD CONSTRAINT "ticks_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_ratings" ADD CONSTRAINT "route_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_ratings" ADD CONSTRAINT "route_ratings_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_crags" ADD CONSTRAINT "favorite_crags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_crags" ADD CONSTRAINT "favorite_crags_cragId_fkey" FOREIGN KEY ("cragId") REFERENCES "crags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_forecasts" ADD CONSTRAINT "weather_forecasts_cragId_fkey" FOREIGN KEY ("cragId") REFERENCES "crags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_lists" ADD CONSTRAINT "gear_lists_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_items" ADD CONSTRAINT "gear_items_gearListId_fkey" FOREIGN KEY ("gearListId") REFERENCES "gear_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crag_submissions" ADD CONSTRAINT "crag_submissions_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
