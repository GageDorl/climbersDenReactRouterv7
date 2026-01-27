-- AlterTable
ALTER TABLE "gear_lists" ADD COLUMN     "groupId" TEXT;

-- AddForeignKey
ALTER TABLE "gear_lists" ADD CONSTRAINT "gear_lists_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
