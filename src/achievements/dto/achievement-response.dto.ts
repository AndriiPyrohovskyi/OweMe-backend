import { ApiProperty } from '@nestjs/swagger';

export class AchievementDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  tier: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  target: number;

  @ApiProperty()
  unlocked: boolean;

  @ApiProperty({ required: false })
  unlockedAt?: Date;
}

export class AchievementsSummaryDto {
  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  unlockedCount: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  completionPercentage: number;

  @ApiProperty({ type: [AchievementDto] })
  achievements: AchievementDto[];

  @ApiProperty({ type: [AchievementDto] })
  recentlyUnlocked: AchievementDto[];
}
