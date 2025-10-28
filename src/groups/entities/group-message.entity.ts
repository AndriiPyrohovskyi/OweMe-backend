import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { GroupMember } from "./group-member.entity";
import { MessageMention } from "./message-mention.entity";

@Entity('GroupMessage')
export class GroupMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMember, { onDelete: 'CASCADE' })
    sender: GroupMember

    @Column()
    message: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => MessageMention, messageMention => messageMention.message, { cascade: ['insert', 'update', 'remove'] })
    mentions: MessageMention[]
}