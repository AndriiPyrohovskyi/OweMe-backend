import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GroupMessage } from "./group-message.entity";
import { GroupMember } from "./group-member.entity";

@Entity('MessageMention')
export class MessageMention {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMessage, groupMessage => groupMessage.mentions, { onDelete: 'CASCADE' })
    message: GroupMessage;

    @ManyToOne(() => GroupMember, groupMember => groupMember.mentions, { onDelete: 'CASCADE' })
    mentiones: GroupMember; 
}