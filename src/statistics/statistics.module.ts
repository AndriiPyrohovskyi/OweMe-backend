import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { FullOwe } from '../owes/entities/full-owe.entity';
import { OweParticipant } from '../owes/entities/owe-partipicipant.entity';
import { OweReturn } from '../owes/entities/owe-return.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FullOwe,
      OweParticipant,
      OweReturn,
      GroupMember,
      User,
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
