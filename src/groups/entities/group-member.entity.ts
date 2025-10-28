import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import { Group } from './group.entity';
import { GroupsUserRole } from 'src/common/enums';
import { GroupRolesLog } from './group-log.entity';
import { MessageMention } from './message-mention.entity';
import { RequestFromGroup } from './request-from-group.entity';
import { RequestToGroup } from './request-to-group.entity';

@Entity('GroupMember')
export class GroupMember {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Group, group => group.members, { onDelete: 'CASCADE' })
    group: Group

    @ManyToOne(() => User, user => user.groups)
    user: User

    @Column({enum: GroupsUserRole, default: GroupsUserRole.Member})
    role: GroupsUserRole

    @CreateDateColumn()
    joinedAt: Date

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.actioner, { cascade: ['insert', 'update', 'remove'] })
    rolesInLogs: GroupRolesLog[];

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.actioned, { cascade: ['insert', 'update', 'remove'] })
    rolesOutLogs: GroupRolesLog[];

    @OneToMany(() => MessageMention, messageMention => messageMention.message, { cascade: ['insert', 'update', 'remove'] })
    mentions: MessageMention[]

    @OneToMany(() => RequestFromGroup, groupRequest => groupRequest.sender, { cascade: ['insert', 'update', 'remove'] })
    sendedRequestsFromGroup: RequestFromGroup[]

    @OneToMany(() => RequestToGroup, groupRequest => groupRequest.actioner, { cascade: ['insert', 'update', 'remove'] })
    actionedGroupRequests: RequestToGroup[]

    @OneToMany(() => RequestFromGroup, requestFromGroup => requestFromGroup.canceledBy, { cascade: ['insert', 'update', 'remove'] })
    canceledRequestsFromGroup: RequestFromGroup[]
}