import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { SummaryStatisticsDto, FullStatisticsDto } from './dto/statistics-response.dto';

@ApiTags('statistics')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Отримати коротку статистику користувача' })
  @ApiResponse({
    status: 200,
    description: 'Коротка статистика успішно отримана',
    type: SummaryStatisticsDto,
  })
  async getSummaryStatistics(
    @CurrentUser('id') userId: number,
  ): Promise<SummaryStatisticsDto> {
    return this.statisticsService.getSummaryStatistics(userId);
  }

  @Get('full')
  @ApiOperation({ summary: 'Отримати повну статистику користувача' })
  @ApiResponse({
    status: 200,
    description: 'Повна статистика успішно отримана',
    type: FullStatisticsDto,
  })
  async getFullStatistics(
    @CurrentUser('id') userId: number,
  ): Promise<FullStatisticsDto> {
    return this.statisticsService.getFullStatistics(userId);
  }
}
