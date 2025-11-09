import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum WalletStatus {
    ACTIVE = 'active',
    FROZEN = 'frozen',
    BANNED = 'banned'
}

@Entity('Wallet')
export class Wallet {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    @Index()
    user: User;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    balance: number;

    @Column({ length: 3, default: 'USD' })
    currency: string;

    @Column({
        type: 'enum',
        enum: WalletStatus,
        default: WalletStatus.ACTIVE
    })
    status: WalletStatus;

    @Column({ nullable: true, length: 100 })
    stripeCustomerId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
