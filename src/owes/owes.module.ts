import { Module } from '@nestjs/common';
import { OwesService } from './owes.service';
import { OwesController } from './owes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FullOwe } from './entities/full-owe.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';
import { MessageOweMention } from './entities/message-owe-mention.entity';
import { GroupMember } from 'src/groups/entities/group-member.entity';
import { UsersModule } from 'src/users/users.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { OweAccessGuard } from 'src/auth/guards/owe-access.guard';
import { GroupMemberOrAdminGuard } from 'src/auth/guards/group-member-or-admin.guard';
import { OweOwnerGuard } from 'src/auth/guards/owe-owner.guard';
import { ParticipantUserGuard } from 'src/auth/guards/participant-user.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
    FullOwe, 
    OweItem, 
    OweParticipant, 
    OweReturn, 
    MessageOweMention,
    GroupMember
  ]), 
  UsersModule,
  WalletModule
],
  controllers: [OwesController],
  providers: [OwesService, OweAccessGuard, GroupMemberOrAdminGuard, OweOwnerGuard, ParticipantUserGuard],
  exports: [OwesService]
})

export class OwesModule {}