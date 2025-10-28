import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';

@Entity('FriendshipRequest')
@Index(['sender', 'receiver'])
@Index(['requestStatus'])
export class FriendshipRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.sentFriendRequests, { onDelete: 'CASCADE' })
    sender: User;

    @ManyToOne(() => User, user => user.receivedFriendRequests, { onDelete: 'CASCADE' })
    receiver: User;

    @Column({ enum: RequestStatus, default: RequestStatus.Opened })
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    acceptedAt: Date; // When the friend request was accepted (null = pending or declined)

    @Column({ nullable: true })
    finishedAt: Date; // When the request was finalized (accepted/declined/canceled)
}