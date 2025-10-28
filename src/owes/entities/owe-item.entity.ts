import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { FullOwe } from './full-owe.entity';
import { OweStatus } from 'src/common/enums';
import { OweParticipant } from './owe-partipicipant.entity';

@Entity('OweItem')
@Index(['fullOwe', 'status'])
@Index(['status'])
export class OweItem {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => FullOwe, fullOwe => fullOwe.oweItems, { onDelete: 'CASCADE' })
    fullOwe: FullOwe

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    sum: number

    @Column({ length: 200 })
    name: string

    @Column({ nullable: true, length: 1000 })
    description: string

    @Column({ length: 500 })
    imageUrl: string

    @Column({ enum: OweStatus, default: OweStatus.Opened })
    status: OweStatus;

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({ nullable: true })
    finishedAt: Date

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.oweItem, { cascade: ['insert', 'update', 'remove'] })
    oweParticipants: OweParticipant[]
}