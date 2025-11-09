import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('Achievement')
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  icon: string;

  @Column({ default: 'bronze' })
  tier: string; // bronze, silver, gold, platinum, diamond

  @Column('simple-json', { nullable: true })
  requirement: {
    type: string; // 'count', 'amount', 'streak', 'special'
    target: number;
    field?: string;
  };

  @Column({ default: 0 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
