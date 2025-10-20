import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

@Module({
  imports: [],
  controllers: [GroupsController],
  providers: [GroupsService],
})

export class GroupsModule {}