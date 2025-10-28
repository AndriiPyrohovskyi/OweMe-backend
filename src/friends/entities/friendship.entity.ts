import { User } from 'src/users/entities/user.entity';
import {Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from 'typeorm';
import { FriendshipRequest } from './friendship-request.entity';

@Entity('Friendship')
export class Friendship {
    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => FriendshipRequest, friendRequest => friendRequest.friendship, { cascade: true, onDelete: 'CASCADE' })
    @JoinColumn()
    friendRequest: FriendshipRequest;
}