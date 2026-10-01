-- CreateEnum
CREATE TYPE "ConvertJobStatus" AS ENUM ('pending', 'active', 'done', 'failed');

-- CreateTable
CREATE TABLE "convert_jobs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "original_file_url" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "status" "ConvertJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convert_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convert_jobs_document_id_key" ON "convert_jobs"("document_id");

-- CreateIndex
CREATE INDEX "convert_jobs_status_run_after_idx" ON "convert_jobs"("status", "run_after");

-- AddForeignKey
ALTER TABLE "convert_jobs" ADD CONSTRAINT "convert_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
