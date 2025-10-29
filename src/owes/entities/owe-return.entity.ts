import { ReturnStatus } from 'src/common/enums';
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

    @Column({ enum: ReturnStatus, default: ReturnStatus.Opened })
    status: ReturnStatus

    @ManyToOne(() => OweParticipant, oweParticipant => oweParticipant.oweReturns, { onDelete: 'CASCADE' })
    participant: OweParticipant
}