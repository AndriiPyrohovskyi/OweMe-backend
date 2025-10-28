import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import { GroupMember } from './group-member.entity';

@Entity('RequestFromGroup')
export class RequestFromGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMember, groupMember => groupMember.sendedRequestsFromGroup, { onDelete: 'CASCADE' })
    sender: GroupMember;

    @ManyToOne(() => User, user => user.receviedGroupRequests)
    recevier: User;

    @Column({enum: RequestStatus, default: RequestStatus.Opened})
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({nullable: true})
    finishedAt: Date;

    @ManyToOne(() => GroupMember, groupMember => groupMember.canceledRequestsFromGroup, { nullable: true, onDelete: 'SET NULL' })
    canceledBy: GroupMember
}