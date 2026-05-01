-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailPreferences" JSONB NOT NULL DEFAULT '{"failures": true, "weekly": true, "welcome": true}';
