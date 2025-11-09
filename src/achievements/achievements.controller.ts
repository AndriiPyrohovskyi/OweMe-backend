import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { AchievementsSummaryDto } from './dto/achievement-response.dto';

@ApiTags('achievements')
@ApiBearerAuth()
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Отримати всі досягнення користувача' })
  @ApiResponse({
    status: 200,
    description: 'Досягнення успішно отримані',
    type: AchievementsSummaryDto,
  })
  async getUserAchievements(
    @CurrentUser('id') userId: number,
  ): Promise<AchievementsSummaryDto> {
    return this.achievementsService.getUserAchievements(userId);
  }
}
