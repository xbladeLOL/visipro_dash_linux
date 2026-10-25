CREATE TABLE "email_unsubscribe_feedback" (
  "recipientKey" TEXT NOT NULL,
  "reasonCode" VARCHAR(64) NOT NULL,
  "comment" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_unsubscribe_feedback_pkey" PRIMARY KEY ("recipientKey")
);

CREATE INDEX "email_unsubscribe_feedback_reasonCode_idx"
ON "email_unsubscribe_feedback"("reasonCode");

ALTER TABLE "email_unsubscribe_feedback"
ADD CONSTRAINT "email_unsubscribe_feedback_recipientKey_fkey"
FOREIGN KEY ("recipientKey") REFERENCES "email_suppressions"("recipientKey")
ON DELETE CASCADE ON UPDATE CASCADE;
