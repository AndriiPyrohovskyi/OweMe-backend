import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { GroupMember } from './group-member.entity';
import { Group } from './group.entity';

@Entity('GroupRolesLog')
export class GroupRolesLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesInLogs)
    actioner: GroupMember

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesOutLogs)
    actioned: GroupMember

    @ManyToOne(() => Group, group => group.groupRolesLogs)
    group: Group
}