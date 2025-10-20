import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import { OweItem } from './owe-item.entity';
import { OweStatus } from 'src/common/enums';
import { MessageOweMention } from './message-owe-mention.entity';

@Entity('FullOwe')
export class FullOwe {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @Column({nullable: true})
    description: string

    @Column({nullable: true})
    image: string

    @CreateDateColumn()
    createdAt: Date

    @Column({nullable: true})
    finishedAt: Date

    @ManyToOne(() => User, user => user.owesOut)
    fromUser: User

    @Column({enum: OweStatus, default: OweStatus.Opened})
    status: OweStatus;

    @OneToMany(() => OweItem, oweItem => oweItem.fullOwe)
    oweItems: OweItem[]

    @OneToMany(() => MessageOweMention, messageOweMention => messageOweMention.fullOwe)
    oweMentions: MessageOweMention[]
}