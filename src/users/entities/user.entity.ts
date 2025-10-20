import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { UserChangeLog } from './user-change-log.entity';

@Entity('User')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column()
    username: string;

    @Column()
    email: string;

    @Column({nullable: true})
    avatarUrl: string;

    //maybe in future - theme

    @Column({nullable: true})
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioned)
    changeLogsIn: UserChangeLog;

    @OneToMany(() => UserChangeLog, userChangeLog => userChangeLog.actioner)
    changeLogsOut: UserChangeLog;
}