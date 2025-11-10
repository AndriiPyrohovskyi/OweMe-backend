import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { FullOwe } from './full-owe.entity';
import { OweParticipant } from './owe-partipicipant.entity';

@Entity('OweItem')
@Index(['fullOwe'])
export class OweItem {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => FullOwe, fullOwe => fullOwe.oweItems, { onDelete: 'CASCADE' })
    fullOwe: FullOwe

    @Column({ length: 200 })
    name: string

    @Column({ nullable: true, length: 1000 })
    description: string

    @Column('simple-array', { nullable: true })
    imageUrls: string[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @OneToMany(() => OweParticipant, oweParticipant => oweParticipant.oweItem, { cascade: ['insert', 'update', 'remove'] })
    oweParticipants: OweParticipant[]
}