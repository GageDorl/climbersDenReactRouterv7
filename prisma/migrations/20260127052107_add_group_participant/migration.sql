-- CreateTable
CREATE TABLE "group_chat_participants" (
    "id" TEXT NOT NULL,
    "groupChatId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_chat_participants_participantId_idx" ON "group_chat_participants"("participantId");

-- CreateIndex
CREATE INDEX "group_chat_participants_groupChatId_idx" ON "group_chat_participants"("groupChatId");

-- CreateIndex
CREATE UNIQUE INDEX "group_chat_participants_groupChatId_participantId_key" ON "group_chat_participants"("groupChatId", "participantId");

-- AddForeignKey
ALTER TABLE "group_chat_participants" ADD CONSTRAINT "group_chat_participants_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "group_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_chat_participants" ADD CONSTRAINT "group_chat_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
