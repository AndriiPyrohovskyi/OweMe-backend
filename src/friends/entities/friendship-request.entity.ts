import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import { Friendship } from './friendship.entity';

@Entity('FriendshipRequest')
export class FriendshipRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.sendedFriendRequests, { onDelete: 'CASCADE' })
    sender: User;

    @ManyToOne(() => User, user => user.receviedFriendRequests, { onDelete: 'CASCADE' })
    recevier: User;

    @Column({enum: RequestStatus, default: RequestStatus.Opened})
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({nullable: true})
    finishedAt: Date;

    @OneToOne(() => Friendship, friendship => friendship.friendRequest, {nullable: true})
    friendship: Friendship;
}