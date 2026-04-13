-- Friend loans V1
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');
CREATE TYPE "LoanLedgerEventType" AS ENUM ('REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'FUNDED', 'REPAYMENT_APPLIED', 'COMPLETED');
CREATE TYPE "LoanSourceGameType" AS ENUM ('SLOT', 'ROULETTE', 'BLACKJACK_SOLO', 'BLACKJACK_MULTI', 'POKER_CASH');

CREATE TABLE "loan_requests" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "repaymentRate" INTEGER NOT NULL,
    "interestRate" INTEGER NOT NULL,
    "totalDue" INTEGER NOT NULL,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "principalAmount" INTEGER NOT NULL,
    "interestRate" INTEGER NOT NULL,
    "totalDue" INTEGER NOT NULL,
    "repaidAmount" INTEGER NOT NULL DEFAULT 0,
    "remainingAmount" INTEGER NOT NULL,
    "repaymentRate" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastRepaymentAt" TIMESTAMP(3),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loan_repayments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "sourceGameType" "LoanSourceGameType" NOT NULL,
    "sourceReferenceId" TEXT NOT NULL,
    "grossWinAmount" INTEGER NOT NULL,
    "repaymentAmount" INTEGER NOT NULL,
    "borrowerNetReceived" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loan_ledger_events" (
    "id" TEXT NOT NULL,
    "loanId" TEXT,
    "requestId" TEXT,
    "type" "LoanLedgerEventType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_ledger_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loans_requestId_key" ON "loans"("requestId");
CREATE INDEX "loan_requests_borrowerId_status_idx" ON "loan_requests"("borrowerId", "status");
CREATE INDEX "loan_requests_lenderId_status_idx" ON "loan_requests"("lenderId", "status");
CREATE INDEX "loans_borrowerId_status_idx" ON "loans"("borrowerId", "status");
CREATE INDEX "loan_repayments_loanId_idx" ON "loan_repayments"("loanId");
CREATE INDEX "loan_repayments_borrowerId_idx" ON "loan_repayments"("borrowerId");
CREATE INDEX "loan_ledger_events_loanId_idx" ON "loan_ledger_events"("loanId");
CREATE INDEX "loan_ledger_events_createdAt_idx" ON "loan_ledger_events"("createdAt");

ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loans" ADD CONSTRAINT "loans_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "loan_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loans" ADD CONSTRAINT "loans_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_ledger_events" ADD CONSTRAINT "loan_ledger_events_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_ledger_events" ADD CONSTRAINT "loan_ledger_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "loan_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "loan_ledger_events_requestId_idx" ON "loan_ledger_events"("requestId");
