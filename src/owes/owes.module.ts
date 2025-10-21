import { Module } from '@nestjs/common';
import { OwesService } from './owes.service';
import { OwesController } from './owes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FullOwe } from './entities/full-owe.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';
import { MessageOweMention } from './entities/message-owe-mention.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FullOwe]), 
            TypeOrmModule.forFeature([OweItem]),
            TypeOrmModule.forFeature([OweParticipant]),
            TypeOrmModule.forFeature([OweReturn]),
            TypeOrmModule.forFeature([MessageOweMention]),
            ],
  controllers: [OwesController],
  providers: [OwesService],
  exports: [OwesService]
})

export class OwesModule {}