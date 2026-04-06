-- AlterTable
ALTER TABLE "user" ADD COLUMN     "desired_hours_max" INTEGER DEFAULT 40,
ADD COLUMN     "desired_hours_min" INTEGER DEFAULT 20;
