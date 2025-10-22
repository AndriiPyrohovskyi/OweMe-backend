import { User } from 'src/users/entities/user.entity';
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

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => GroupMember, groupMember => groupMember.group, { cascade: ['insert', 'update'] })
    members: GroupMember[];

    @OneToMany(() => RequestToGroup, requestToGroup => requestToGroup.group, { cascade: ['insert', 'update'] })
    recievedRequestsToGroup: RequestToGroup[]
}