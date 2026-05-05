-- Phase 21 — ClientInvoice (파트너가 고객사에 발행하는 인보이스)

CREATE TABLE IF NOT EXISTS "ClientInvoice" (
    "id" TEXT NOT NULL,
    "partnerClientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodYearMonth" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "vat" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientInvoice_partnerClientId_invoiceNumber_key"
    ON "ClientInvoice"("partnerClientId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "ClientInvoice_partnerClientId_status_idx"
    ON "ClientInvoice"("partnerClientId", "status");
CREATE INDEX IF NOT EXISTS "ClientInvoice_periodYearMonth_idx"
    ON "ClientInvoice"("periodYearMonth");

ALTER TABLE "ClientInvoice"
    ADD CONSTRAINT "ClientInvoice_partnerClientId_fkey"
    FOREIGN KEY ("partnerClientId") REFERENCES "PartnerClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
