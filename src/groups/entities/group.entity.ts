import {Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm'
import { GroupMember } from './group-member.entity';
import { GroupRolesLog } from './group-log.entity';
import { RequestToGroup } from './request-to-group.entity';
import { OweParticipant } from 'src/owes/entities/owe-partipicipant.entity';

@Entity('Group')
@Index(['tag'])
@Index(['name'])
export class Group {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string;

    @Column({ unique: true, length: 50 })
    tag: string;
    

    @Column({ nullable: true, length: 500 })
    avatarUrl: string;


    @Column({ nullable: true, length: 1000 })
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => GroupMember, groupMember => groupMember.group)
    members: GroupMember[];

    @OneToMany(() => RequestToGroup, requestToGroup => requestToGroup.group)
    receivedRequestsToGroup: RequestToGroup[]

    @OneToMany(() => GroupRolesLog, groupRolesLog => groupRolesLog.group)
    groupRolesLogs: GroupRolesLog[]

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.group)
    groupOwesParticipants: OweParticipant[]
}