import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';
import { OweItem } from './owe-item.entity';
import { OweStatus } from 'src/common/enums';
import { MessageOweMention } from './message-owe-mention.entity';

@Entity('FullOwe')
@Index(['fromUser', 'status'])
@Index(['status'])
@Index(['createdAt'])
export class FullOwe {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ length: 200 })
    name: string

    @Column({ nullable: true, length: 1000 })
    description: string

    @Column({ nullable: true, length: 500 })
    image: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({ nullable: true })
    finishedAt: Date

    @ManyToOne(() => User, user => user.owesOut, { onDelete: 'CASCADE' })
    fromUser: User

    @Column({ enum: OweStatus, default: OweStatus.Opened })
    status: OweStatus;

    @OneToMany(() => OweItem, oweItem => oweItem.fullOwe, { cascade: ['insert', 'update', 'remove'] })
    oweItems: OweItem[]

    @OneToMany(() => MessageOweMention, messageOweMention => messageOweMention.fullOwe, { cascade: ['insert', 'update'] })
    oweMentions: MessageOweMention[]
}