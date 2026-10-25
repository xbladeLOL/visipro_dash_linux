ALTER TABLE "Prospect" ADD COLUMN "lostAt" TIMESTAMP(3);

-- L'instant exact n'etait pas stocke auparavant. La derniere modification est
-- la meilleure estimation disponible pour les prospects deja perdus.
UPDATE "Prospect"
SET "lostAt" = "updatedAt"
WHERE "stage" = 'LOST';
