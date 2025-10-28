import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'
import { GroupMember } from './group-member.entity';
import { Group } from './group.entity';
import { GroupsUserRole } from 'src/common/enums';

@Entity('GroupRolesLog')
@Index(['group', 'createdAt'])
@Index(['target', 'createdAt'])
export class GroupRolesLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Group, group => group.groupRolesLogs, { onDelete: 'CASCADE' })
    group: Group

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesActorLogs, { onDelete: 'SET NULL', nullable: true })
    actor: GroupMember // Member who changed the role (can be null if system change)

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesTargetLogs, { onDelete: 'CASCADE' })
    target: GroupMember // Member whose role was changed

    @Column({ enum: GroupsUserRole, default: GroupsUserRole.Member })
    newRole: GroupsUserRole;

    @CreateDateColumn()
    createdAt: Date;
}