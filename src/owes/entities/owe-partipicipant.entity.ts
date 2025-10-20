import {Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import { OweItem } from './owe-item.entity';
import { User } from 'src/users/entities/user.entity';
import { OweReturn } from './owe-return.entity';

@Entity('OweParticipant')
export class OweParticipant {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    sum: number

    @ManyToOne(() => OweItem, oweItem => oweItem.oweParticipants)
    oweItem: OweItem

    @ManyToOne(() => User, user => user.owesIn)
    toUser: User

    @OneToMany(() => OweReturn, oweReturn => oweReturn.participant)
    oweReturns: OweReturn[]
}