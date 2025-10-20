import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FullOwe } from './full-owe.entity';
import { OweStatus } from 'src/common/enums';
import { OweParticipant } from './owe-partipicipant.entity';

@Entity('OweItem')
export class OweItem {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => FullOwe, fullOwe => fullOwe.oweItems)
    fullOwe: FullOwe

    @Column()
    sum: number

    @Column()
    name: string

    @Column({nullable: true})
    description: string

    @Column()
    imageUrl: string

    @Column({enum: OweStatus, default: OweStatus.Opened})
    status: OweStatus;

    @CreateDateColumn()
    createdAt: Date

    @Column({nullable: true})
    finishedAt: Date

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.oweItem)
    oweParticipants: OweParticipant[]
}