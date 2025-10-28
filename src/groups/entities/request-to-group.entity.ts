import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';

@Entity('RequestToGroup')
@Index(['sender', 'group'])
@Index(['group', 'requestStatus'])
export class RequestToGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.receivedGroupRequests, { onDelete: 'CASCADE' })
    sender: User; // User who wants to join the group

    @ManyToOne(() => Group, group => group.receivedRequestsToGroup, { onDelete: 'CASCADE' })
    group: Group;

    @Column({ enum: RequestStatus, default: RequestStatus.Opened })
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => GroupMember, groupMember => groupMember.actionedGroupRequests, { nullable: true, onDelete: 'SET NULL' })
    actor: GroupMember; // Group member who accepted/declined the request

    @Column({ nullable: true })
    finishedAt: Date;
}