-- Міграція для зміни imageUrl на imageUrls (масив)
-- Дата: 2025-11-10

-- 1. Додаємо нову колонку imageUrls
ALTER TABLE "OweItem" ADD COLUMN IF NOT EXISTS "imageUrls" text;

-- 2. Переносимо дані з imageUrl в imageUrls (якщо є)
UPDATE "OweItem" 
SET "imageUrls" = "imageUrl" 
WHERE "imageUrl" IS NOT NULL AND "imageUrl" != '';

-- 3. Видаляємо стару колонку imageUrl
ALTER TABLE "OweItem" DROP COLUMN IF EXISTS "imageUrl";

-- Примітка: PostgreSQL зберігає simple-array як текст з комами
