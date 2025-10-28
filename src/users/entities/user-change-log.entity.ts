import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Index} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from 'src/common/enums';

@Entity('UserChangeLog')
@Index(['actioned', 'created_at'])
@Index(['actioner', 'created_at'])
export class UserChangeLog{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({enum: UserRole, default: UserRole.User})
    newRole: UserRole

    @ManyToOne(() => User, user => user.changeLogsOut, { onDelete: 'SET NULL', nullable: true })
    actioner: User; // User who made the change (can be null if system change)

    @ManyToOne(() => User, user => user.changeLogsIn, { onDelete: 'CASCADE' })
    actioned: User; // User whose role was changed

    @CreateDateColumn()
    created_at: Date;
}