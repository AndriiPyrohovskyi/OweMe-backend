import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet, WalletStatus } from '../users/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../users/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import Decimal from 'decimal.js';
import { CreateDepositDto, CreateTransferDto, PayDebtDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
    private stripe: Stripe;

    constructor(
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private dataSource: DataSource,
        private configService: ConfigService,
    ) {
        // Ініціалізуємо Stripe (використовуємо test key)
        const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
        }
        this.stripe = new Stripe(stripeKey, {
            apiVersion: '2025-10-29.clover',
        });
    }

    // Створити гаманець для нового користувача
    async createWallet(user: User): Promise<Wallet> {
        const existingWallet = await this.walletRepository.findOne({ 
            where: { user: { id: user.id } },
            relations: ['user']
        });

        if (existingWallet) {
            throw new ConflictException('Wallet already exists for this user');
        }

        // Створюємо Stripe Customer
        const stripeCustomer = await this.stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            metadata: {
                userId: user.id.toString(),
            },
        });

        const wallet = this.walletRepository.create({
            user,
            balance: 0,
            currency: 'USD',
            status: WalletStatus.ACTIVE,
            stripeCustomerId: stripeCustomer.id,
        });

        return this.walletRepository.save(wallet);
    }

    // Отримати гаманець користувача
    async getWallet(userId: number): Promise<Wallet> {
        const wallet = await this.walletRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        return wallet;
    }

    // Поповнити баланс через Stripe
    async deposit(userId: number, depositDto: CreateDepositDto, ipAddress?: string): Promise<Transaction> {
        const wallet = await this.getWallet(userId);

        if (wallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('Wallet is not active');
        }

        // Генеруємо idempotency key
        const idempotencyKey = `deposit-${userId}-${Date.now()}-${Math.random()}`;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let paymentIntent: Stripe.PaymentIntent;
            let stripeChargeId: string;

            // Якщо використовується тестовий payment method, створюємо його
            if (depositDto.paymentMethodId === 'pm_test_visa') {
                // Створюємо тестовий payment method з картки Visa
                const testPaymentMethod = await this.stripe.paymentMethods.create({
                    type: 'card',
                    card: {
                        token: 'tok_visa', // Stripe test token
                    },
                });

                // Прив'язуємо до клієнта
                await this.stripe.paymentMethods.attach(testPaymentMethod.id, {
                    customer: wallet.stripeCustomerId,
                });

                // Створюємо Payment Intent
                paymentIntent = await this.stripe.paymentIntents.create({
                    amount: Math.round(depositDto.amount * 100), // В центах
                    currency: 'usd',
                    customer: wallet.stripeCustomerId,
                    payment_method: testPaymentMethod.id,
                    confirm: true,
                    automatic_payment_methods: {
                        enabled: true,
                        allow_redirects: 'never',
                    },
                    description: depositDto.description || 'Wallet deposit',
                    metadata: {
                        userId: userId.toString(),
                        walletId: wallet.id.toString(),
                        type: 'deposit',
                    },
                });
            } else {
                // Використовуємо наданий payment method
                paymentIntent = await this.stripe.paymentIntents.create({
                    amount: Math.round(depositDto.amount * 100), // В центах
                    currency: 'usd',
                    customer: wallet.stripeCustomerId,
                    payment_method: depositDto.paymentMethodId,
                    confirm: true,
                    automatic_payment_methods: {
                        enabled: true,
                        allow_redirects: 'never',
                    },
                    description: depositDto.description || 'Wallet deposit',
                    metadata: {
                        userId: userId.toString(),
                        walletId: wallet.id.toString(),
                        type: 'deposit',
                    },
                });
            }

            if (paymentIntent.status !== 'succeeded') {
                throw new BadRequestException('Payment failed');
            }

            stripeChargeId = paymentIntent.latest_charge as string;

            // Додаємо баланс
            const newBalance = new Decimal(wallet.balance.toString())
                .plus(new Decimal(depositDto.amount))
                .toNumber();

            wallet.balance = newBalance;
            await queryRunner.manager.save(wallet);

            // Створюємо транзакцію
            const transaction = queryRunner.manager.create(Transaction, {
                wallet,
                type: TransactionType.DEPOSIT,
                amount: depositDto.amount,
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                stripePaymentIntentId: paymentIntent.id,
                stripeChargeId: stripeChargeId,
                idempotencyKey,
                description: depositDto.description || 'Wallet deposit',
                ipAddress,
                metadata: {
                    paymentIntentStatus: paymentIntent.status,
                },
            });

            const savedTransaction = await queryRunner.manager.save(transaction);

            await queryRunner.commitTransaction();

            return savedTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Переказ між користувачами
    async transfer(fromUserId: number, transferDto: CreateTransferDto, ipAddress?: string): Promise<Transaction> {
        const fromWallet = await this.getWallet(fromUserId);
        const toUser = await this.userRepository.findOne({ where: { id: transferDto.toUserId } });

        if (!toUser) {
            throw new NotFoundException('Recipient user not found');
        }

        const toWallet = await this.getWallet(transferDto.toUserId);

        if (fromWallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('Your wallet is not active');
        }

        if (toWallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('Recipient wallet is not active');
        }

        // Перевіряємо баланс
        const fromBalance = new Decimal(fromWallet.balance.toString());
        const amount = new Decimal(transferDto.amount);

        if (fromBalance.lessThan(amount)) {
            throw new BadRequestException('Insufficient funds');
        }

        const idempotencyKey = `transfer-${fromUserId}-${transferDto.toUserId}-${Date.now()}`;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Списуємо з відправника
            fromWallet.balance = fromBalance.minus(amount).toNumber();
            await queryRunner.manager.save(fromWallet);

            // Додаємо отримувачу
            const toBalance = new Decimal(toWallet.balance.toString());
            toWallet.balance = toBalance.plus(amount).toNumber();
            await queryRunner.manager.save(toWallet);

            // Створюємо транзакцію для відправника
            const fromTransaction = queryRunner.manager.create(Transaction, {
                wallet: fromWallet,
                type: TransactionType.TRANSFER,
                amount: -transferDto.amount, // Негативне для списання
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                idempotencyKey,
                relatedUser: toUser,
                description: transferDto.description || `Transfer to ${toUser.username}`,
                ipAddress,
            });

            await queryRunner.manager.save(fromTransaction);

            // Створюємо транзакцію для отримувача
            const toTransaction = queryRunner.manager.create(Transaction, {
                wallet: toWallet,
                type: TransactionType.TRANSFER,
                amount: transferDto.amount,
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                idempotencyKey: `${idempotencyKey}-receive`,
                relatedUser: fromWallet.user,
                description: transferDto.description || `Transfer from ${fromWallet.user.username}`,
                ipAddress,
            });

            await queryRunner.manager.save(toTransaction);

            await queryRunner.commitTransaction();

            return fromTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Оплатити борг через гаманець
    async payDebt(userId: number, payDebtDto: PayDebtDto, ipAddress?: string): Promise<Transaction> {
        const wallet = await this.getWallet(userId);

        if (wallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('Wallet is not active');
        }

        // Перевіряємо баланс
        const balance = new Decimal(wallet.balance.toString());
        const amount = new Decimal(payDebtDto.amount);

        if (balance.lessThan(amount)) {
            throw new BadRequestException('Insufficient funds');
        }

        const idempotencyKey = `payment-${userId}-${payDebtDto.oweId}-${Date.now()}`;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Списуємо гроші
            wallet.balance = balance.minus(amount).toNumber();
            await queryRunner.manager.save(wallet);

            // Створюємо транзакцію
            const transaction = queryRunner.manager.create(Transaction, {
                wallet,
                type: TransactionType.PAYMENT,
                amount: -payDebtDto.amount, // Негативне
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                idempotencyKey,
                relatedOweId: payDebtDto.oweId,
                description: payDebtDto.description || `Payment for debt #${payDebtDto.oweId}`,
                ipAddress,
            });

            const savedTransaction = await queryRunner.manager.save(transaction);

            await queryRunner.commitTransaction();

            return savedTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Отримати історію транзакцій
    async getTransactions(userId: number, limit = 50, offset = 0): Promise<Transaction[]> {
        const wallet = await this.getWallet(userId);

        return this.transactionRepository.find({
            where: { wallet: { id: wallet.id } },
            relations: ['relatedUser'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    // Заморозити гаманець (для адміна)
    async freezeWallet(userId: number, reason?: string): Promise<Wallet> {
        const wallet = await this.getWallet(userId);
        wallet.status = WalletStatus.FROZEN;
        return this.walletRepository.save(wallet);
    }

    // Розморозити гаманець
    async unfreezeWallet(userId: number): Promise<Wallet> {
        const wallet = await this.getWallet(userId);
        wallet.status = WalletStatus.ACTIVE;
        return this.walletRepository.save(wallet);
    }

    // Заморозити кошти для повернення боргу
    async holdFundsForDebtReturn(
        userId: number, 
        amount: number, 
        oweReturnId: number,
        description?: string
    ): Promise<Transaction> {
        const wallet = await this.getWallet(userId);

        if (wallet.status !== WalletStatus.ACTIVE) {
            throw new BadRequestException('Wallet is not active');
        }

        // Перевіряємо баланс
        const balance = new Decimal(wallet.balance.toString());
        const holdAmount = new Decimal(amount);

        if (balance.lessThan(holdAmount)) {
            throw new BadRequestException('Insufficient funds to hold for debt return');
        }

        const idempotencyKey = `hold-${userId}-${oweReturnId}-${Date.now()}`;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Списуємо кошти (заморожуємо)
            wallet.balance = balance.minus(holdAmount).toNumber();
            await queryRunner.manager.save(wallet);

            // Створюємо транзакцію hold
            const transaction = queryRunner.manager.create(Transaction, {
                wallet,
                type: TransactionType.DEBT_RETURN_HOLD,
                amount: -amount, // Негативне значення - списання
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.PENDING,
                idempotencyKey,
                relatedOweReturnId: oweReturnId,
                description: description || `Held funds for debt return #${oweReturnId}`,
            });

            const savedTransaction = await queryRunner.manager.save(transaction);

            await queryRunner.commitTransaction();

            return savedTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Розморозити кошти (при відміні або відхиленні)
    async releaseFundsForDebtReturn(
        holdTransactionId: number,
        oweReturnId: number,
        reason: 'canceled' | 'declined'
    ): Promise<Transaction> {
        const holdTransaction = await this.transactionRepository.findOne({
            where: { id: holdTransactionId },
            relations: ['wallet', 'wallet.user'],
        });

        if (!holdTransaction) {
            throw new NotFoundException('Hold transaction not found');
        }

        if (holdTransaction.type !== TransactionType.DEBT_RETURN_HOLD) {
            throw new BadRequestException('Transaction is not a hold transaction');
        }

        if (holdTransaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException('Hold transaction is not in pending state');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Повертаємо кошти на баланс
            const wallet = holdTransaction.wallet;
            const balance = new Decimal(wallet.balance.toString());
            const releaseAmount = new Decimal(Math.abs(holdTransaction.amount));

            wallet.balance = balance.plus(releaseAmount).toNumber();
            await queryRunner.manager.save(wallet);

            // Оновлюємо статус hold транзакції
            holdTransaction.status = TransactionStatus.REFUNDED;
            await queryRunner.manager.save(holdTransaction);

            // Створюємо транзакцію release
            const releaseTransaction = queryRunner.manager.create(Transaction, {
                wallet,
                type: TransactionType.DEBT_RETURN_RELEASE,
                amount: releaseAmount.toNumber(), // Позитивне значення - повернення
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                relatedOweReturnId: oweReturnId,
                description: `Released funds for ${reason} debt return #${oweReturnId}`,
                metadata: { 
                    reason,
                    originalHoldTransactionId: holdTransactionId 
                },
            });

            const savedTransaction = await queryRunner.manager.save(releaseTransaction);

            await queryRunner.commitTransaction();

            return savedTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Перевести кошти при прийнятті повернення боргу
    async transferFundsForAcceptedDebtReturn(
        holdTransactionId: number,
        oweReturnId: number,
        recipientUserId: number
    ): Promise<Transaction> {
        const holdTransaction = await this.transactionRepository.findOne({
            where: { id: holdTransactionId },
            relations: ['wallet', 'wallet.user'],
        });

        if (!holdTransaction) {
            throw new NotFoundException('Hold transaction not found');
        }

        if (holdTransaction.type !== TransactionType.DEBT_RETURN_HOLD) {
            throw new BadRequestException('Transaction is not a hold transaction');
        }

        if (holdTransaction.status !== TransactionStatus.PENDING) {
            throw new BadRequestException('Hold transaction is not in pending state');
        }

        const recipientWallet = await this.getWallet(recipientUserId);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Додаємо кошти отримувачу
            const recipientBalance = new Decimal(recipientWallet.balance.toString());
            const transferAmount = new Decimal(Math.abs(holdTransaction.amount));

            recipientWallet.balance = recipientBalance.plus(transferAmount).toNumber();
            await queryRunner.manager.save(recipientWallet);

            // Оновлюємо статус hold транзакції
            holdTransaction.status = TransactionStatus.COMPLETED;
            await queryRunner.manager.save(holdTransaction);

            // Створюємо транзакцію переказу для отримувача
            const transferTransaction = queryRunner.manager.create(Transaction, {
                wallet: recipientWallet,
                type: TransactionType.DEBT_RETURN_TRANSFER,
                amount: transferAmount.toNumber(), // Позитивне значення
                fee: 0,
                currency: 'USD',
                status: TransactionStatus.COMPLETED,
                relatedOweReturnId: oweReturnId,
                relatedUser: holdTransaction.wallet.user,
                description: `Received debt return payment #${oweReturnId}`,
                metadata: { 
                    originalHoldTransactionId: holdTransactionId,
                    fromUserId: holdTransaction.wallet.user.id 
                },
            });

            const savedTransaction = await queryRunner.manager.save(transferTransaction);

            await queryRunner.commitTransaction();

            return savedTransaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
