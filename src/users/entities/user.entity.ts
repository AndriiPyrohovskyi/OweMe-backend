import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { UserChangeLog } from './user-change-log.entity';
import { FriendshipRequest } from 'src/friends/entities/friendship-request.entity';
import { GroupMember } from 'src/groups/entities/group-member.entity';
import { RequestFromGroup } from 'src/groups/entities/request-from-group.entity';
import { FullOwe } from 'src/owes/entities/full-owe.entity';
import { OweParticipant } from 'src/owes/entities/owe-partipicipant.entity';

@Entity('User')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({unique: true})
    username: string;

    @Column()
    passwordHash: string;

    @Column({unique: true})
    email: string;

    @Column({nullable: true})
    avatarUrl: string;

    //maybe in future - theme

    @Column({nullable: true})
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioned, { cascade: ['insert', 'update'] })
    changeLogsIn: UserChangeLog[]; //last element - your role

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioner, { cascade: ['insert', 'update'] })
    changeLogsOut: UserChangeLog[];

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.sender, { cascade: ['insert', 'update'] })
    sendedFriendRequests: FriendshipRequest[];

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.recevier, { cascade: ['insert', 'update'] })
    receviedFriendRequests: FriendshipRequest[];

    @OneToMany(() => GroupMember, groupMember => groupMember.user, { cascade: ['insert', 'update'] })
    groups: GroupMember[];

    @OneToMany(() => RequestFromGroup, groupRequest => groupRequest.recevier, { cascade: ['insert', 'update'] })
    receviedGroupRequests: RequestFromGroup[];

    @OneToMany(() => FullOwe, fullOwe => fullOwe.fromUser, { cascade: ['insert', 'update'] })
    owesOut: FullOwe[]

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.toUser, { cascade: ['insert', 'update'] })
    owesIn: OweParticipant[]
}