import { GroupMessage } from "src/groups/entities/group-message.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FullOwe } from "./full-owe.entity";

@Entity('MessageOweMention')
export class MessageOweMention {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupMessage, groupMessage => groupMessage.mentions, { onDelete: 'CASCADE' })
    message: GroupMessage;

    @ManyToOne(() => FullOwe, fullOwe => fullOwe.oweMentions, { onDelete: 'CASCADE' })
    fullOwe: FullOwe; 
}