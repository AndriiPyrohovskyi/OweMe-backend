import {Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('Friends')
export class Friends {
    @PrimaryGeneratedColumn()
    id: number
}