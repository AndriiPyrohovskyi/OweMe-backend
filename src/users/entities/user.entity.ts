import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { UserChangeLog } from './user-change-log.entity';
import { FriendshipRequest } from 'src/friends/entities/friendship-request.entity';
import { GroupMember } from 'src/groups/entities/group-member.entity';
import { GroupRequest } from 'src/groups/entities/group-request.entity';
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

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioned)
    changeLogsIn: UserChangeLog[]; //last element - your role

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioner)
    changeLogsOut: UserChangeLog[];

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.sender)
    sendedFriendRequests: FriendshipRequest[];

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.recevier)
    receviedFriendRequests: FriendshipRequest[];

    @OneToMany(() => GroupMember, groupMember => groupMember.user)
    groups: GroupMember[];

    @OneToMany(() => GroupRequest, groupRequest => groupRequest.recevier)
    receviedGroupRequests: GroupRequest[];

    @OneToMany(() => FullOwe, fullOwe => fullOwe.fromUser)
    owesOut: FullOwe[]

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.toUser)
    owesIn: OweParticipant[]
}