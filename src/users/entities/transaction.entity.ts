import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { Wallet } from '../../users/entities/wallet.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
    DEPOSIT = 'deposit',           // Поповнення через Stripe
    WITHDRAWAL = 'withdrawal',     // Виведення (для майбутнього)
    TRANSFER = 'transfer',         // Переказ між користувачами
    PAYMENT = 'payment',           // Оплата боргу
    REFUND = 'refund',            // Повернення коштів
    DEBT_RETURN_HOLD = 'debt_return_hold',     // Заморожені кошти для повернення боргу
    DEBT_RETURN_RELEASE = 'debt_return_release', // Розморожені кошти (canceled/declined)
    DEBT_RETURN_TRANSFER = 'debt_return_transfer' // Переказ при прийнятті повернення
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

@Entity('Transaction')
@Index(['createdAt'])
@Index(['status'])
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
    @Index()
    wallet: Wallet;

    @Column({
        type: 'enum',
        enum: TransactionType
    })
    type: TransactionType;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    fee: number;

    @Column({ length: 3, default: 'USD' })
    currency: string;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status: TransactionStatus;

    @Column({ nullable: true, length: 255 })
    stripePaymentIntentId: string; // Stripe Payment Intent ID

    @Column({ nullable: true, length: 255 })
    stripeChargeId: string; // Stripe Charge ID

    @Column({ nullable: true, length: 100 })
    idempotencyKey: string; // Для уникнення дублікатів

    @ManyToOne(() => User, { nullable: true })
    relatedUser: User; // З ким пов'язана транзакція (для transfer/payment)

    @Column({ nullable: true })
    relatedOweId: number; // ID боргу, якщо це payment

    @Column({ nullable: true })
    relatedOweReturnId: number; // ID повернення боргу

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>; // Додаткові дані

    @Column({ nullable: true, length: 500 })
    description: string;

    @Column({ nullable: true, length: 45 })
    ipAddress: string;

    @CreateDateColumn()
    createdAt: Date;
}
