import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupMessage } from './entities/group-message.entity';
import { GroupRolesLog } from './entities/group-log.entity';
import { RequestToGroup } from './entities/request-to-group.entity';
import { RequestFromGroup } from './entities/request-from-group.entity';
import { MessageMention } from './entities/message-mention.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, GroupMessage, GroupRolesLog, RequestToGroup, RequestFromGroup, MessageMention])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService]
})

export class GroupsModule {}
