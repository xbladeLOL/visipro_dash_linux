CREATE TYPE "PhoneQualificationStatus" AS ENUM ('PENDING', 'TO_CALL', 'NOT_A_FIT');

ALTER TABLE "Prospect"
ADD COLUMN "phoneQualificationStatus" "PhoneQualificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "phoneQualifiedAt" TIMESTAMP(3);

CREATE INDEX "Prospect_phoneQualificationStatus_idx" ON "Prospect"("phoneQualificationStatus");
