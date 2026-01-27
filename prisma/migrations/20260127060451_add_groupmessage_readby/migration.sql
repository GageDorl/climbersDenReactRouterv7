-- AlterTable
ALTER TABLE "group_messages" ADD COLUMN     "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
