#!/bin/bash

# Скрипт для застосування міграції wallet integration
# Використання: ./apply-wallet-integration-migration.sh

set -e

echo "🚀 Застосування міграції для інтеграції wallet з системою повернення боргів..."

# Завантажуємо змінні оточення
if [ -f .env ]; then
    source .env
else
    echo "❌ Файл .env не знайдено!"
    exit 1
fi

# Перевіряємо наявність psql
if ! command -v psql &> /dev/null; then
    echo "❌ psql не встановлено. Встановіть PostgreSQL client."
    exit 1
fi

# Застосовуємо міграцію
echo "📝 Застосування міграції..."
psql $DATABASE_URL -f migrations/add-wallet-integration-to-returns.sql

if [ $? -eq 0 ]; then
    echo "✅ Міграція успішно застосована!"
    echo ""
    echo "📋 Додані поля:"
    echo "   - Transaction.relatedOweReturnId"
    echo "   - OweReturn.holdTransactionId"
    echo ""
    echo "📋 Додані типи транзакцій:"
    echo "   - debt_return_hold"
    echo "   - debt_return_release"
    echo "   - debt_return_transfer"
    echo ""
    echo "🎉 Система готова до використання!"
else
    echo "❌ Помилка при застосуванні міграції"
    exit 1
fi
