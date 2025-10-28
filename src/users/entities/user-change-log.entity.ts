import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from 'src/common/enums';

@Entity('UserChangeLog')
export class UserChangeLog{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({enum: UserRole, default: UserRole.User})
    newRole: UserRole

    @ManyToOne(() => User, user => user.changeLogsOut, { onDelete: 'SET NULL', nullable: true })
    actioner: User;

    @ManyToOne(() => User, user => user.changeLogsIn, { onDelete: 'CASCADE' })
    actioned: User;

    @CreateDateColumn()
    created_at: Date;
}