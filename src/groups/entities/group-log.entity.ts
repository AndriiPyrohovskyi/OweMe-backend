import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { GroupMember } from './group-member.entity';
import { Group } from './group.entity';
import { GroupsUserRole } from 'src/common/enums';

@Entity('GroupRolesLog')
export class GroupRolesLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Group, group => group.groupRolesLogs)
    group: Group

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesInLogs)
    actioner: GroupMember

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesOutLogs)
    actioned: GroupMember

    @Column({default: GroupsUserRole.Member})
    newRole: GroupsUserRole;
}