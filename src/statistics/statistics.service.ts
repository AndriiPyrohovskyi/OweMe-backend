import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FullOwe } from '../owes/entities/full-owe.entity';
import { OweParticipant } from '../owes/entities/owe-partipicipant.entity';
import { OweReturn } from '../owes/entities/owe-return.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import {
  SummaryStatisticsDto,
  FullStatisticsDto,
  TopUserDto,
  TopGroupDto,
  InterestingFactDto,
  MonthlyActivityDto,
} from './dto/statistics-response.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(FullOwe)
    private fullOweRepository: Repository<FullOwe>,
    @InjectRepository(OweParticipant)
    private oweParticipantRepository: Repository<OweParticipant>,
    @InjectRepository(OweReturn)
    private oweReturnRepository: Repository<OweReturn>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async getSummaryStatistics(userId: number): Promise<SummaryStatisticsDto> {
    // Кількість друзів (через прийняті запити в дружбу)
    const friendsCountQuery = await this.dataSource.query(
      `SELECT COUNT(DISTINCT CASE 
        WHEN "senderId" = $1 THEN "receiverId"
        WHEN "receiverId" = $1 THEN "senderId"
      END) as count
      FROM "FriendshipRequest"
      WHERE ("senderId" = $1 OR "receiverId" = $1) AND "requestStatus" = 'Accepted'`,
      [userId],
    );
    const totalFriends = parseInt(friendsCountQuery[0]?.count || '0');

    // Активні борги (як відправник FullOwe)
    const sentOwesCount = await this.fullOweRepository
      .createQueryBuilder('fullOwe')
      .leftJoin('fullOwe.fromUser', 'fromUser')
      .where('fromUser.id = :userId', { userId })
      .getCount();

    // Активні борги (як учасник OweParticipant)
    const receivedOwesCount = await this.oweParticipantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.toUser', 'toUser')
      .where('toUser.id = :userId', { userId })
      .andWhere('participant.status = :status', { status: 'Accepted' })
      .getCount();

    const totalActiveOwes = sentOwesCount + receivedOwesCount;

    // Сума боргів отриманих (де я - відправник FullOwe)
    const owedToMeQuery = await this.oweParticipantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.oweItem', 'oweItem')
      .leftJoin('oweItem.fullOwe', 'fullOwe')
      .leftJoin('fullOwe.fromUser', 'fromUser')
      .select('SUM(participant.sum)', 'total')
      .where('fromUser.id = :userId', { userId })
      .andWhere('participant.status = :status', { status: 'Accepted' })
      .getRawOne();
    const totalOwedToMe = parseFloat(owedToMeQuery?.total || '0');

    // Сума боргів відправлених (де я - учасник OweParticipant)
    const iOweThemQuery = await this.oweParticipantRepository
      .createQueryBuilder('participant')
      .leftJoin('participant.toUser', 'toUser')
      .select('SUM(participant.sum)', 'total')
      .where('toUser.id = :userId', { userId })
      .andWhere('participant.status = :status', { status: 'Accepted' })
      .getRawOne();
    const totalIOweThem = parseFloat(iOweThemQuery?.total || '0');

    // Кількість груп
    const totalGroups = await this.groupMemberRepository
      .createQueryBuilder('member')
      .leftJoin('member.user', 'user')
      .where('user.id = :userId', { userId })
      .getCount();

    // Кількість повернень (де я - учасник, який повертає борг)
    const totalReturns = await this.oweReturnRepository
      .createQueryBuilder('oweReturn')
      .leftJoin('oweReturn.participant', 'participant')
      .leftJoin('participant.toUser', 'toUser')
      .where('toUser.id = :userId', { userId })
      .andWhere('oweReturn.status = :status', { status: 'Accepted' })
      .getCount();

    return {
      totalFriends,
      totalActiveOwes,
      totalOwedToMe,
      totalIOweThem,
      totalGroups,
      totalReturns,
    };
  }

  async getFullStatistics(userId: number): Promise<FullStatisticsDto> {
    const summary = await this.getSummaryStatistics(userId);

    // Топ друзів за кількістю боргів (з якими найбільше взаємодій)
    const topFriendsByOwesQuery = await this.dataSource.query(
      `SELECT 
        u.id as "userId",
        u.username,
        u."avatarUrl",
        COUNT(*) as count
      FROM "OweParticipant" op
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE (fu.id = $1 OR u.id = $1) AND op.status = 'Accepted' AND u.id != $1 AND fu.id != $1
      GROUP BY u.id, u.username, u."avatarUrl"
      ORDER BY count DESC
      LIMIT 5`,
      [userId],
    );

    const topFriendsByOwes: TopUserDto[] = topFriendsByOwesQuery.map(
      (item: any) => ({
        userId: item.userId,
        username: item.username,
        avatarUrl: item.avatarUrl,
        value: parseInt(item.count),
        description: `${item.count} боргів`,
      }),
    );

    // Топ друзів за сумою боргів (кому я найбільше винен або хто мені)
    const topFriendsByAmountQuery = await this.dataSource.query(
      `SELECT 
        u.id as "userId",
        u.username,
        u."avatarUrl",
        SUM(op.sum) as total
      FROM "OweParticipant" op
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND op.status = 'Accepted'
      GROUP BY u.id, u.username, u."avatarUrl"
      ORDER BY total DESC
      LIMIT 5`,
      [userId],
    );

    const topFriendsByAmount: TopUserDto[] = topFriendsByAmountQuery.map(
      (item: any) => ({
        userId: item.userId,
        username: item.username,
        avatarUrl: item.avatarUrl,
        value: parseFloat(item.total),
        description: `${parseFloat(item.total).toFixed(2)} грн`,
      }),
    );

    // Топ груп (де найбільше боргів через OweParticipant з groupId)
    const topGroupsQuery = await this.dataSource.query(
      `SELECT 
        g.id as "groupId",
        g.name as "groupName",
        g."avatarUrl",
        COUNT(*) as count
      FROM "OweParticipant" op
      INNER JOIN "Group" g ON g.id = op."groupId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND op."groupId" IS NOT NULL AND op.status = 'Accepted'
      GROUP BY g.id, g.name, g."avatarUrl"
      ORDER BY count DESC
      LIMIT 5`,
      [userId],
    );

    const topGroups: TopGroupDto[] = topGroupsQuery.map((item: any) => ({
      groupId: item.groupId,
      groupName: item.groupName,
      avatarUrl: item.avatarUrl,
      value: parseInt(item.count),
      description: `${item.count} боргів`,
    }));

    // Найбільший створений борг (де я відправник FullOwe)
    const biggestCreatedQuery = await this.dataSource.query(
      `SELECT 
        op.sum,
        u.username,
        oi."createdAt"
      FROM "OweParticipant" op
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND op.status = 'Accepted'
      ORDER BY op.sum DESC
      LIMIT 1`,
      [userId],
    );

    const biggestOweCreated = biggestCreatedQuery[0]
      ? {
          amount: parseFloat(biggestCreatedQuery[0].sum),
          username: biggestCreatedQuery[0].username,
          date: biggestCreatedQuery[0].createdAt,
        }
      : undefined;

    // Найбільший отриманий борг (де я учасник OweParticipant)
    const biggestReceivedQuery = await this.dataSource.query(
      `SELECT 
        op.sum,
        fu.username,
        oi."createdAt"
      FROM "OweParticipant" op
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE u.id = $1 AND op.status = 'Accepted'
      ORDER BY op.sum DESC
      LIMIT 1`,
      [userId],
    );

    const biggestOweReceived = biggestReceivedQuery[0]
      ? {
          amount: parseFloat(biggestReceivedQuery[0].sum),
          username: biggestReceivedQuery[0].username,
          date: biggestReceivedQuery[0].createdAt,
        }
      : undefined;

    // Середня сума боргу
    const averageQuery = await this.dataSource.query(
      `SELECT AVG(op.sum) as avg
      FROM "OweParticipant" op
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      INNER JOIN "User" tu ON tu.id = op."toUserId"
      WHERE (fu.id = $1 OR tu.id = $1) AND op.status = 'Accepted'`,
      [userId],
    );
    const averageOweAmount = parseFloat(averageQuery[0]?.avg || '0');

    // Найактивніший день тижня
    const activeDayQuery = await this.dataSource.query(
      `SELECT 
        EXTRACT(DOW FROM fo."createdAt") as day,
        COUNT(*) as count
      FROM "FullOwe" fo
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1
      GROUP BY day
      ORDER BY count DESC
      LIMIT 1`,
      [userId],
    );

    const dayNames = [
      'Неділя',
      'Понеділок',
      'Вівторок',
      'Середа',
      'Четвер',
      'П\'ятниця',
      'Субота',
    ];
    const mostActiveDay = activeDayQuery[0]
      ? dayNames[parseInt(activeDayQuery[0].day)]
      : 'Немає даних';

    // Активність за 6 місяців
    const monthlyActivity: MonthlyActivityDto[] = await this.getMonthlyActivity(
      userId,
    );

    // Цікаві факти
    const interestingFacts: InterestingFactDto[] = await this.getInterestingFacts(
      userId,
      summary,
    );

    // Найдовший борг
    const longestOweQuery = await this.dataSource.query(
      `SELECT 
        EXTRACT(DAY FROM (NOW() - oi."createdAt")) as days,
        u.username
      FROM "OweParticipant" op
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND op.status = 'Accepted'
      ORDER BY days DESC
      LIMIT 1`,
      [userId],
    );

    const longestOwe = longestOweQuery[0]
      ? {
          days: parseInt(longestOweQuery[0].days),
          username: longestOweQuery[0].username,
        }
      : undefined;

    // Найшвидше повернення
    const fastestReturnQuery = await this.dataSource.query(
      `SELECT 
        EXTRACT(DAY FROM (r."createdAt" - oi."createdAt")) as days,
        u.username
      FROM "OweReturn" r
      INNER JOIN "OweParticipant" op ON op.id = r."participantId"
      INNER JOIN "User" u ON u.id = op."toUserId"
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND r.status = 'Accepted'
      ORDER BY days ASC
      LIMIT 1`,
      [userId],
    );

    const fastestReturn = fastestReturnQuery[0]
      ? {
          days: parseInt(fastestReturnQuery[0].days),
          username: fastestReturnQuery[0].username,
        }
      : undefined;

    return {
      summary,
      topFriendsByOwes,
      topFriendsByAmount,
      topGroups,
      interestingFacts,
      monthlyActivity,
      biggestOweCreated,
      biggestOweReceived,
      averageOweAmount,
      mostActiveDay,
      longestOwe,
      fastestReturn,
    };
  }

  private async getMonthlyActivity(
    userId: number,
  ): Promise<MonthlyActivityDto[]> {
    const activity = await this.dataSource.query(
      `SELECT 
        TO_CHAR(date_trunc('month', fo."createdAt"), 'YYYY-MM') as month,
        COUNT(CASE WHEN fu.id = $1 THEN 1 END) as "owesCreated",
        COUNT(CASE WHEN tu.id = $1 THEN 1 END) as "owesReceived",
        0 as "returnsMade"
      FROM "FullOwe" fo
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      LEFT JOIN "OweItem" oi ON oi."fullOweId" = fo.id
      LEFT JOIN "OweParticipant" op ON op."oweItemId" = oi.id
      LEFT JOIN "User" tu ON tu.id = op."toUserId"
      WHERE fu.id = $1 OR tu.id = $1
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6`,
      [userId],
    );

    return activity.map((item: any) => ({
      month: item.month,
      owesCreated: parseInt(item.owesCreated || '0'),
      owesReceived: parseInt(item.owesReceived || '0'),
      returnsMade: 0,
    }));
  }

  private async getInterestingFacts(
    userId: number,
    summary: SummaryStatisticsDto,
  ): Promise<InterestingFactDto[]> {
    const facts: InterestingFactDto[] = [];

    // Рівень довіри
    const trustLevel =
      summary.totalActiveOwes > 0
        ? ((summary.totalReturns / summary.totalActiveOwes) * 100).toFixed(0)
        : '0';
    facts.push({
      title: 'Рівень довіри',
      value: `${trustLevel}%`,
      description: 'Відсоток повернених боргів',
      icon: '🤝',
    });

    // Середня сума боргу
    if (summary.totalActiveOwes > 0) {
      const avgAmount = (
        (summary.totalOwedToMe + summary.totalIOweThem) /
        summary.totalActiveOwes
      ).toFixed(2);
      facts.push({
        title: 'Середній борг',
        value: `${avgAmount} грн`,
        description: 'Типова сума ваших боргів',
        icon: '💰',
      });
    }

    // Баланс
    const balance = summary.totalOwedToMe - summary.totalIOweThem;
    facts.push({
      title: balance >= 0 ? 'Ви в плюсі' : 'Ви в мінусі',
      value: `${Math.abs(balance).toFixed(2)} грн`,
      description: balance >= 0 ? 'Вам винні більше' : 'Ви винні більше',
      icon: balance >= 0 ? '📈' : '📉',
    });

    // Найщедріший день
    const mostGenerousDay = await this.dataSource.query(
      `SELECT 
        DATE(oi."createdAt") as date,
        SUM(op.sum) as total
      FROM "OweParticipant" op
      INNER JOIN "OweItem" oi ON oi.id = op."oweItemId"
      INNER JOIN "FullOwe" fo ON fo.id = oi."fullOweId"
      INNER JOIN "User" fu ON fu.id = fo."fromUserId"
      WHERE fu.id = $1 AND op.status = 'Accepted'
      GROUP BY date
      ORDER BY total DESC
      LIMIT 1`,
      [userId],
    );

    if (mostGenerousDay[0]) {
      facts.push({
        title: 'Найщедріший день',
        value: new Date(mostGenerousDay[0].date).toLocaleDateString('uk-UA'),
        description: `Створено боргів на ${parseFloat(mostGenerousDay[0].total).toFixed(2)} грн`,
        icon: '🎁',
      });
    }

    return facts;
  }
}
