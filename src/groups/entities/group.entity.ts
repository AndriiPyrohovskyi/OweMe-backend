import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import { GroupMember } from './group-member.entity';
import { GroupRolesLog } from './group-log.entity';
import { RequestToGroup } from './request-to-group.entity';

@Entity('Group')
export class Group {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    tag: string;

    @Column({nullable: true})
    avatarUrl: string;

    @Column({nullable: true})
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => GroupMember, groupMember => groupMember.group, { cascade: ['insert', 'update', 'remove'] })
    members: GroupMember[];

    @OneToMany(() => RequestToGroup, requestToGroup => requestToGroup.group, { cascade: ['insert', 'update', 'remove'] })
    recievedRequestsToGroup: RequestToGroup[]

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.group, { cascade: ['insert', 'update', 'remove'] })
    groupRolesLogs: GroupRolesLog[]
}