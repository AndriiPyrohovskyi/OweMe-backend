import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from 'src/common/enums';

@Entity('UserChangeLog')
export class UserChangeLog{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({enum: UserRole, default: UserRole.User})
    newRole: UserRole

    @ManyToOne(() => User, user => user.changeLogsOut)
    actioner: User;

    @ManyToOne(() => User, user => user.changeLogsIn)
    actioned: User;
}