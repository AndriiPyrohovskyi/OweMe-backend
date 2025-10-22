import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';
import {Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import { Group } from './group.entity';

@Entity('RequestToGroup')
export class RequestToGroup {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.receviedGroupRequests)
    sender: User;

    @ManyToOne(() => Group, group => group.recievedRequestsToGroup)
    group: Group;

    @Column({enum: RequestStatus, default: RequestStatus.Opened})
    requestStatus: RequestStatus;

    @CreateDateColumn()
    createdAt: Date;

    @Column({nullable: true})
    finishedAt: Date;
}