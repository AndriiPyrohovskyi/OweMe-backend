import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './entities/friendship.entity';
import { FriendshipRequest } from './entities/friendship-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, FriendshipRequest])],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService]
})

export class FriendsModule {}
