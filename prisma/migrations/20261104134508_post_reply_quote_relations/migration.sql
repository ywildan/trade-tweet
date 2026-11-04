-- CreateIndex
CREATE INDEX "Post_replyToId_createdAt_idx" ON "Post"("replyToId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_quoteOfId_idx" ON "Post"("quoteOfId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quoteOfId_fkey" FOREIGN KEY ("quoteOfId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
