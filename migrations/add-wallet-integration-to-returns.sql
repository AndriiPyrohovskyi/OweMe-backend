-- Міграція для інтеграції wallet з системою повернення боргів
-- Дата: 2025-11-09

-- Додати нові типи транзакцій
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'debt_return_hold';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'debt_return_release';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'debt_return_transfer';

-- Додати поле relatedOweReturnId до Transaction
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "relatedOweReturnId" INTEGER;

-- Додати поле holdTransactionId до OweReturn
ALTER TABLE "OweReturn"
ADD COLUMN IF NOT EXISTS "holdTransactionId" INTEGER;

-- Додати індекс для швидкого пошуку
CREATE INDEX IF NOT EXISTS "IDX_transaction_owe_return" 
ON "Transaction" ("relatedOweReturnId");

CREATE INDEX IF NOT EXISTS "IDX_owe_return_hold_transaction" 
ON "OweReturn" ("holdTransactionId");

-- Додати коментарі
COMMENT ON COLUMN "Transaction"."relatedOweReturnId" IS 'ID повернення боргу, якщо це транзакція пов''язана з поверненням';
COMMENT ON COLUMN "OweReturn"."holdTransactionId" IS 'ID транзакції заморожених коштів';
