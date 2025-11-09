import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn, Index } from 'typeorm';
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

    @Column({ nullable: true, length: 100 })
    firstName: string;

    @Column({ nullable: true, length: 100 })
    lastName: string;

    @Column({ unique: true, length: 50 })
    @Index()
    username: string;

    @Column({ length: 255 })
    passwordHash: string;

    @Column({ unique: true, length: 255 })
    @Index()
    email: string;

    @Column({ nullable: true, length: 500 })
    avatarUrl: string;

    @Column({ nullable: true, length: 500 })
    description: string;

    @Column({ default: false })
    isBanned: boolean;

    @Column({ nullable: true, length: 500, type: 'varchar' })
    banReason?: string;

    @Column({ nullable: true, type: 'timestamp' })
    bannedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioned)
    changeLogsIn: UserChangeLog[]; // Logs where this user is the target

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioner)
    changeLogsOut: UserChangeLog[]; // Logs where this user is the actor

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.sender)
    sentFriendRequests: FriendshipRequest[];

    @OneToMany(() => FriendshipRequest, friendshipRequest => friendshipRequest.receiver)
    receivedFriendRequests: FriendshipRequest[];

    @OneToMany(() => GroupMember, groupMember => groupMember.user)
    groups: GroupMember[];

    @OneToMany(() => RequestFromGroup, groupRequest => groupRequest.receiver)
    receivedGroupRequests: RequestFromGroup[];

    @OneToMany(() => FullOwe, fullOwe => fullOwe.fromUser)
    owesOut: FullOwe[]

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.toUser)
    owesIn: OweParticipant[]
}