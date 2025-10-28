import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Check, Index} from 'typeorm';
import { OweItem } from './owe-item.entity';
import { User } from 'src/users/entities/user.entity';
import { OweReturn } from './owe-return.entity';
import { Group } from 'src/groups/entities/group.entity';

@Entity('OweParticipant')
@Check(`("toUserId" IS NOT NULL AND "groupId" IS NULL) OR ("toUserId" IS NULL AND "groupId" IS NOT NULL)`)
@Index(['oweItem', 'toUser'])
@Index(['oweItem', 'group'])
@Index(['toUser'])
@Index(['group'])
export class OweParticipant {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    sum: number

    @ManyToOne(() => OweItem, oweItem => oweItem.oweParticipants, { onDelete: 'CASCADE' })
    oweItem: OweItem

    @ManyToOne(() => User, user => user.owesIn, { onDelete: 'CASCADE', nullable: true })
    toUser: User

    @ManyToOne(() => Group, group => group.groupOwesParticipants, { onDelete: 'CASCADE', nullable: true })
    group: Group

    @CreateDateColumn()
    createdAt: Date

    @OneToMany(() => OweReturn, oweReturn => oweReturn.participant, { cascade: ['insert', 'update', 'remove'] })
    oweReturns: OweReturn[]
}