import { ApiProperty } from '@nestjs/swagger';

export class SummaryStatisticsDto {
  @ApiProperty({ description: 'Загальна кількість друзів' })
  totalFriends: number;

  @ApiProperty({ description: 'Загальна кількість активних боргів' })
  totalActiveOwes: number;

  @ApiProperty({ description: 'Загальна сума боргів (отриманих)' })
  totalOwedToMe: number;

  @ApiProperty({ description: 'Загальна сума боргів (відправлених)' })
  totalIOweThem: number;

  @ApiProperty({ description: 'Кількість груп' })
  totalGroups: number;

  @ApiProperty({ description: 'Кількість повернень' })
  totalReturns: number;
}

export class TopUserDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  avatarUrl?: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  description: string;
}

export class TopGroupDto {
  @ApiProperty()
  groupId: number;

  @ApiProperty()
  groupName: string;

  @ApiProperty()
  avatarUrl?: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  description: string;
}

export class InterestingFactDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  value: string | number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  icon?: string;
}

export class MonthlyActivityDto {
  @ApiProperty()
  month: string;

  @ApiProperty()
  owesCreated: number;

  @ApiProperty()
  owesReceived: number;

  @ApiProperty()
  returnsMade: number;
}

export class FullStatisticsDto {
  @ApiProperty({ description: 'Коротка статистика' })
  summary: SummaryStatisticsDto;

  @ApiProperty({ description: 'Топ друзів за кількістю боргів', type: [TopUserDto] })
  topFriendsByOwes: TopUserDto[];

  @ApiProperty({ description: 'Топ друзів за сумою боргів', type: [TopUserDto] })
  topFriendsByAmount: TopUserDto[];

  @ApiProperty({ description: 'Топ груп за активністю', type: [TopGroupDto] })
  topGroups: TopGroupDto[];

  @ApiProperty({ description: 'Цікаві факти', type: [InterestingFactDto] })
  interestingFacts: InterestingFactDto[];

  @ApiProperty({ description: 'Активність за останні 6 місяців', type: [MonthlyActivityDto] })
  monthlyActivity: MonthlyActivityDto[];

  @ApiProperty({ description: 'Найбільший борг, який ви створили' })
  biggestOweCreated?: {
    amount: number;
    username: string;
    date: string;
  };

  @ApiProperty({ description: 'Найбільший борг, який ви отримали' })
  biggestOweReceived?: {
    amount: number;
    username: string;
    date: string;
  };

  @ApiProperty({ description: 'Середня сума боргу' })
  averageOweAmount: number;

  @ApiProperty({ description: 'Найактивніший день тижня' })
  mostActiveDay: string;

  @ApiProperty({ description: 'Найдовший борг (у днях)' })
  longestOwe?: {
    days: number;
    username: string;
  };

  @ApiProperty({ description: 'Найшвидше повернення (у днях)' })
  fastestReturn?: {
    days: number;
    username: string;
  };
}
