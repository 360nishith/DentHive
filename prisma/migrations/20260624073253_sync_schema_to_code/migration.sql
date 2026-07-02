/*
  Warnings:

  - A unique constraint covering the columns `[authId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authId" VARCHAR(255),
ADD COLUMN     "firstName" VARCHAR(100),
ADD COLUMN     "lastName" VARCHAR(100),
ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "users_authId_key" ON "users"("authId");
