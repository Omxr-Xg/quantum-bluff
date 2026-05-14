-- Liste noire d'e-mails : inscription refusée pour âge insuffisant, déblocage à la date légale.
CREATE TABLE "EmailRegistrationAgeBlocklist" (
    "email" TEXT NOT NULL,
    "unblockAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailRegistrationAgeBlocklist_pkey" PRIMARY KEY ("email")
);

CREATE INDEX "EmailRegistrationAgeBlocklist_unblockAt_idx" ON "EmailRegistrationAgeBlocklist"("unblockAt");
