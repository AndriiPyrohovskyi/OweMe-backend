import { Module } from '@nestjs/common';
import { OwesService } from './owes.service';
import { OwesController } from './owes.controller';

@Module({
  imports: [],
  controllers: [OwesController],
  providers: [OwesService],
})

export class OwesModule {}