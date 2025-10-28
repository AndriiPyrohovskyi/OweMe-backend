import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';
import { GroupMember } from './group-member.entity';

@Entity('RequestFromGroup')
@Index(['receiver', 'requestStatus'])
@Index(['sender'])
export class RequestFromGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMember, groupMember => groupMember.sentRequestsFromGroup, { onDelete: 'CASCADE' })
    sender: GroupMember; // Group member who sent the invitation

    @ManyToOne(() => User, user => user.receivedGroupRequests, { onDelete: 'CASCADE' })
    receiver: User; // User who received the invitation

    @Column({ enum: RequestStatus, default: RequestStatus.Opened })
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    finishedAt: Date;

    @ManyToOne(() => GroupMember, groupMember => groupMember.canceledRequestsFromGroup, { nullable: true, onDelete: 'SET NULL' })
    canceledBy: GroupMember // Group member who canceled the invitation
}