import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Achievement } from './achievement.entity';

@Entity('UserAchievement')
export class UserAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  achievementId: number;

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: false })
  unlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  unlockedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
