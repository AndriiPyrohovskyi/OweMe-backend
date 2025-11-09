import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { StatisticsService } from '../statistics/statistics.service';
import {
  AchievementDto,
  AchievementsSummaryDto,
} from './dto/achievement-response.dto';

@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    private statisticsService: StatisticsService,
  ) {}

  async onModuleInit() {
    await this.seedAchievements();
  }

  private async seedAchievements() {
    const existingCount = await this.achievementRepository.count();
    if (existingCount > 0) return;

    const achievements = [
      // Друзі
      {
        code: 'first_friend',
        title: 'Перший друг',
        description: 'Додайте свого першого друга',
        icon: '👋',
        tier: 'bronze',
        requirement: { type: 'count', target: 1, field: 'friends' },
        points: 10,
      },
      {
        code: 'social_butterfly',
        title: 'Соціальна метелик',
        description: 'Додайте 10 друзів',
        icon: '🦋',
        tier: 'silver',
        requirement: { type: 'count', target: 10, field: 'friends' },
        points: 25,
      },
      {
        code: 'popular',
        title: 'Популярний',
        description: 'Додайте 25 друзів',
        icon: '⭐',
        tier: 'gold',
        requirement: { type: 'count', target: 25, field: 'friends' },
        points: 50,
      },

      // Борги
      {
        code: 'first_owe',
        title: 'Перший борг',
        description: 'Створіть свій перший борг',
        icon: '📝',
        tier: 'bronze',
        requirement: { type: 'count', target: 1, field: 'owes_created' },
        points: 10,
      },
      {
        code: 'debt_manager',
        title: 'Менеджер боргів',
        description: 'Створіть 20 боргів',
        icon: '📊',
        tier: 'silver',
        requirement: { type: 'count', target: 20, field: 'owes_created' },
        points: 30,
      },
      {
        code: 'accountant',
        title: 'Бухгалтер',
        description: 'Створіть 50 боргів',
        icon: '🧮',
        tier: 'gold',
        requirement: { type: 'count', target: 50, field: 'owes_created' },
        points: 75,
      },

      // Повернення
      {
        code: 'honest_person',
        title: 'Чесна людина',
        description: 'Поверніть свій перший борг',
        icon: '✅',
        tier: 'bronze',
        requirement: { type: 'count', target: 1, field: 'returns' },
        points: 15,
      },
      {
        code: 'reliable',
        title: 'Надійний',
        description: 'Поверніть 10 боргів',
        icon: '💎',
        tier: 'silver',
        requirement: { type: 'count', target: 10, field: 'returns' },
        points: 40,
      },
      {
        code: 'trustworthy',
        title: 'Гідний довіри',
        description: 'Поверніть 25 боргів',
        icon: '🏆',
        tier: 'gold',
        requirement: { type: 'count', target: 25, field: 'returns' },
        points: 100,
      },

      // Групи
      {
        code: 'team_player',
        title: 'Командний гравець',
        description: 'Приєднайтесь до першої групи',
        icon: '👥',
        tier: 'bronze',
        requirement: { type: 'count', target: 1, field: 'groups' },
        points: 10,
      },
      {
        code: 'group_enthusiast',
        title: 'Груповий ентузіаст',
        description: 'Приєднайтесь до 5 груп',
        icon: '🎭',
        tier: 'silver',
        requirement: { type: 'count', target: 5, field: 'groups' },
        points: 30,
      },

      // Суми
      {
        code: 'big_spender',
        title: 'Великий витратник',
        description: 'Створіть борг на суму понад 1000 грн',
        icon: '💸',
        tier: 'gold',
        requirement: { type: 'amount', target: 1000, field: 'single_owe' },
        points: 50,
      },
      {
        code: 'whale',
        title: 'Кит',
        description: 'Загальна сума створених боргів - понад 10000 грн',
        icon: '🐋',
        tier: 'platinum',
        requirement: { type: 'amount', target: 10000, field: 'total_created' },
        points: 150,
      },

      // Спеціальні
      {
        code: 'early_bird',
        title: 'Рання пташка',
        description: 'Створіть борг до 6 ранку',
        icon: '🌅',
        tier: 'bronze',
        requirement: { type: 'special', target: 1, field: 'early_morning' },
        points: 20,
      },
      {
        code: 'night_owl',
        title: 'Нічна сова',
        description: 'Створіть борг після 23:00',
        icon: '🦉',
        tier: 'bronze',
        requirement: { type: 'special', target: 1, field: 'late_night' },
        points: 20,
      },
      {
        code: 'speed_demon',
        title: 'Швидкісний демон',
        description: 'Поверніть борг менше ніж за добу',
        icon: '⚡',
        tier: 'gold',
        requirement: { type: 'special', target: 1, field: 'fast_return' },
        points: 60,
      },
    ];

    await this.achievementRepository.save(achievements);
  }

  async getUserAchievements(userId: number): Promise<AchievementsSummaryDto> {
    // Отримати всі досягнення
    const allAchievements = await this.achievementRepository.find();

    // Отримати прогрес користувача
    let userAchievements = await this.userAchievementRepository
      .createQueryBuilder('userAchievement')
      .leftJoinAndSelect('userAchievement.achievement', 'achievement')
      .where('userAchievement.userId = :userId', { userId })
      .getMany();

    // Якщо немає записів - створити
    if (userAchievements.length === 0) {
      const newUserAchievements = allAchievements.map((achievement) => ({
        userId,
        achievementId: achievement.id,
        progress: 0,
        unlocked: false,
      }));
      userAchievements = await this.userAchievementRepository.save(
        newUserAchievements,
      );
      // Перезавантажити з relations
      userAchievements = await this.userAchievementRepository
        .createQueryBuilder('userAchievement')
        .leftJoinAndSelect('userAchievement.achievement', 'achievement')
        .where('userAchievement.userId = :userId', { userId })
        .getMany();
    }

    // Оновити прогрес
    await this.updateProgress(userId);

    // Перезавантажити після оновлення
    userAchievements = await this.userAchievementRepository
      .createQueryBuilder('userAchievement')
      .leftJoinAndSelect('userAchievement.achievement', 'achievement')
      .where('userAchievement.userId = :userId', { userId })
      .orderBy('userAchievement.unlocked', 'DESC')
      .addOrderBy('userAchievement.progress', 'DESC')
      .getMany();

    const achievements: AchievementDto[] = userAchievements.map((ua) => ({
      id: ua.achievement.id,
      code: ua.achievement.code,
      title: ua.achievement.title,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      tier: ua.achievement.tier,
      points: ua.achievement.points,
      progress: ua.progress,
      target: ua.achievement.requirement.target,
      unlocked: ua.unlocked,
      unlockedAt: ua.unlockedAt,
    }));

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const totalPoints = achievements
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);
    const completionPercentage = (unlockedCount / achievements.length) * 100;

    const recentlyUnlocked = achievements
      .filter((a) => a.unlocked)
      .sort((a, b) => {
        if (!a.unlockedAt || !b.unlockedAt) return 0;
        return b.unlockedAt.getTime() - a.unlockedAt.getTime();
      })
      .slice(0, 5);

    return {
      totalPoints,
      unlockedCount,
      totalCount: achievements.length,
      completionPercentage,
      achievements,
      recentlyUnlocked,
    };
  }

  private async updateProgress(userId: number) {
    const stats = await this.statisticsService.getSummaryStatistics(userId);
    const userAchievements = await this.userAchievementRepository
      .createQueryBuilder('userAchievement')
      .leftJoinAndSelect('userAchievement.achievement', 'achievement')
      .where('userAchievement.userId = :userId', { userId })
      .getMany();

    for (const ua of userAchievements) {
      const achievement = ua.achievement;
      let progress = 0;

      switch (achievement.requirement.field) {
        case 'friends':
          progress = stats.totalFriends;
          break;
        case 'owes_created':
          progress = stats.totalActiveOwes;
          break;
        case 'returns':
          progress = stats.totalReturns;
          break;
        case 'groups':
          progress = stats.totalGroups;
          break;
        case 'total_created':
          progress = stats.totalOwedToMe;
          break;
        default:
          progress = ua.progress;
      }

      ua.progress = progress;

      if (progress >= achievement.requirement.target && !ua.unlocked) {
        ua.unlocked = true;
        ua.unlockedAt = new Date();
      }

      await this.userAchievementRepository.save(ua);
    }
  }
}
