import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendshipRequest } from './entities/friendship-request.entity';
import { UsersModule } from 'src/users/users.module';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship, FriendshipRequest]),
    UsersModule
  ],
  controllers: [FriendsController],
  providers: [FriendsService, OwnerOrAdminGuard],
  exports: [FriendsService]
})

export class FriendsModule {}
