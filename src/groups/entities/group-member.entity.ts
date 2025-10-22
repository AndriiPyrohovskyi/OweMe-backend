import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import { Group } from './group.entity';
import { GroupsUserRole } from 'src/common/enums';
import { GroupRolesLog } from './group-log.entity';
import { MessageMention } from './message-mention.entity';
import { RequestFromGroup } from './request-from-group.entity';

@Entity('GroupMember')
export class GroupMember {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Group, group => group.members)
    group: Group

    @ManyToOne(() => User, user => user.groups)
    user: User

    @Column({enum: GroupsUserRole, default: GroupsUserRole.Member})
    role: GroupsUserRole

    @CreateDateColumn()
    joinedAt: Date

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.actioner, { cascade: ['insert', 'update'] })
    rolesInLogs: GroupMember[];

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.actioned, { cascade: ['insert', 'update'] })
    rolesOutLogs: GroupMember[];

    @OneToMany(() => MessageMention, messageMention => messageMention.message, { cascade: ['insert', 'update'] })
    mentions: MessageMention[]

    @OneToMany(() => RequestFromGroup, groupRequest => groupRequest.sender, { cascade: ['insert', 'update'] })
    sendedRequestsFromGroup: RequestFromGroup[]
}