import { OweStatus } from 'src/common/enums';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import { OweParticipant } from './owe-partipicipant.entity';

@Entity('OweReturn')
export class OweReturn {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    returned: number

    @CreateDateColumn()
    createdAt: Date

    @Column({nullable: true})
    finishedAt: Date

    @Column({enum: OweStatus, default: OweStatus.Opened})
    status: OweStatus;

    @ManyToOne(() => OweParticipant, oweParticipant => oweParticipant.oweReturns)
    participant: OweParticipant
}