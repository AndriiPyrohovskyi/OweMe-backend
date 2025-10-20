import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import { GroupMember } from './group-member.entity';

@Entity('GroupRolesLog')
export class GroupRolesLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesInLogs)
    actioner: GroupMember

    @ManyToOne(() => GroupMember, groupMember => groupMember.rolesOutLogs)
    actioned: GroupMember
}