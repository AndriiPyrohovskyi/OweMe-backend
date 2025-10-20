import {Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import { User } from './user.entity';

@Entity('UserChangeLog')
export class UserChangeLog{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.changeLogsOut)
    actioner: User;

    @ManyToOne(() => User, user => user.changeLogsIn)
    actioned: User;
}