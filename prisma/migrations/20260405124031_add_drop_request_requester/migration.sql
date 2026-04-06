/*
  Warnings:

  - Added the required column `requested_by_user_id` to the `drop_request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "drop_request" ADD COLUMN     "requested_by_user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "drop_request" ADD CONSTRAINT "drop_request_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
