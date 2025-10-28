import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Index} from 'typeorm'
import { Group } from './group.entity';
import { GroupsUserRole } from 'src/common/enums';
import { GroupRolesLog } from './group-log.entity';
import { MessageMention } from './message-mention.entity';
import { RequestFromGroup } from './request-from-group.entity';
import { RequestToGroup } from './request-to-group.entity';

@Entity('GroupMember')
@Index(['group', 'user'], { unique: true })
@Index(['user'])
@Index(['group', 'role'])
export class GroupMember {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Group, group => group.members, { onDelete: 'CASCADE' })
    group: Group

    @ManyToOne(() => User, user => user.groups, { onDelete: 'CASCADE' })
    user: User

    @Column({ enum: GroupsUserRole, default: GroupsUserRole.Member })
    role: GroupsUserRole

    @CreateDateColumn()
    joinedAt: Date

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.actor)
    rolesActorLogs: GroupRolesLog[]; // Logs where this member changed someone's role

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.target)
    rolesTargetLogs: GroupRolesLog[]; // Logs where this member's role was changed

    @OneToMany(() => MessageMention, messageMention => messageMention.message)
    mentions: MessageMention[]

    @OneToMany(() => RequestFromGroup, groupRequest => groupRequest.sender)
    sentRequestsFromGroup: RequestFromGroup[]

    @OneToMany(() => RequestToGroup, groupRequest => groupRequest.actor)
    actionedGroupRequests: RequestToGroup[]

    @OneToMany(() => RequestFromGroup, requestFromGroup => requestFromGroup.canceledBy)
    canceledRequestsFromGroup: RequestFromGroup[]
}