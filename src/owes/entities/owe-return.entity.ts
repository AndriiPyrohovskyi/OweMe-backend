import { OweStatus } from 'src/common/enums';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';
import { OweParticipant } from './owe-partipicipant.entity';

@Entity('OweReturn')
@Index(['participant', 'status'])
@Index(['createdAt'])
export class OweReturn {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    returned: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({ nullable: true })
    finishedAt: Date

    @Column({ enum: OweStatus, default: OweStatus.Opened })
    status: OweStatus;

    @ManyToOne(() => OweParticipant, oweParticipant => oweParticipant.oweReturns, { onDelete: 'CASCADE' })
    participant: OweParticipant
}