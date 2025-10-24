import { Injectable, NotAcceptableException, NotFoundException } from '@nestjs/common';
import { Friendship } from './entities/friendship.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {Repository} from 'typeorm'
import { FriendshipRequest } from './entities/friendship-request.entity';
import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class FriendsService {
  constructor (
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,

    @InjectRepository(FriendshipRequest)
    private readonly friendshipRequestRepository: Repository<FriendshipRequest>,
  ){}
  friendsHealthcheck(): object {
    return {message: "Friends Controller is running!"};
  }
  // ---------------------------------- Create Methods -------------------------------------
  async sendFriendRequest(senderId: number, recevierId: number): Promise<FriendshipRequest> {
    const friendRequest = this.friendshipRequestRepository.create({
      sender: { id: senderId },
      recevier: { id: recevierId },
      requestStatus: RequestStatus.Opened,
    });

    return await this.friendshipRequestRepository.save(friendRequest);
  }
  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  async acceptFriendRequest(requestId: number): Promise<Friendship> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'recevier'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    friendRequest.requestStatus = RequestStatus.Accepted;
    friendRequest.finishedAt = new Date();
    await this.friendshipRequestRepository.save(friendRequest);

    const friendship = this.friendshipRepository.create({
      friendRequest,
    });

    return await this.friendshipRepository.save(friendship);
  }

  async acceptAllFriendRequestsByUser(userId: number): Promise<Friendship[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { recevier: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'recevier'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const friendships: Friendship[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Accepted;
      friendRequest.finishedAt = new Date();
      await this.friendshipRequestRepository.save(friendRequest);

      const friendship = this.friendshipRepository.create({
        friendRequest,
      });

      friendships.push(await this.friendshipRepository.save(friendship));
    }

    return friendships;
  }

  async declineFriendRequest(requestId: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    friendRequest.requestStatus = RequestStatus.Declined;
    friendRequest.finishedAt = new Date();

    return await this.friendshipRequestRepository.save(friendRequest);
  }

  async declineAllFriendRequestsByUser(userId: number): Promise<Friendship[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { recevier: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'recevier'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const friendships: Friendship[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Declined;
      friendRequest.finishedAt = new Date();
      await this.friendshipRequestRepository.save(friendRequest);

      const friendship = this.friendshipRepository.create({
        friendRequest,
      });

      friendships.push(await this.friendshipRepository.save(friendship));
    }

    return friendships;
  }

  async cancelFriendRequest(requestId: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (friendRequest.requestStatus != RequestStatus.Opened) {
      throw new NotAcceptableException('Friendship request already done!');
    }

    friendRequest.requestStatus = RequestStatus.Canceled;
    friendRequest.finishedAt = new Date();

    return await this.friendshipRequestRepository.save(friendRequest);
  }

  async cancelAllFriendRequestsByUser(userId: number): Promise<Friendship[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { sender: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'recevier'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const friendships: Friendship[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Canceled
      friendRequest.finishedAt = new Date();
      await this.friendshipRequestRepository.save(friendRequest);

      const friendship = this.friendshipRepository.create({
        friendRequest,
      });

      friendships.push(await this.friendshipRepository.save(friendship));
    }

    return friendships;
  }
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  async removeFriend(userId1: number, userId2: number): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      relations: ['friendRequest', 'friendRequest.sender', 'friendRequest.recevier'],
      where: [
        { friendRequest: { sender: { id: userId1 }, recevier: { id: userId2 } } },
        { friendRequest: { sender: { id: userId2 }, recevier: { id: userId1 } } },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendship);
  }
  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getAllFriendships(): Promise<object[]> {
    return await this.friendshipRepository.find({
      relations: [
        'friendRequest',
        'friendRequest.sender',
        'friendRequest.recevier',
        'friendRequest.createdAt',
        'friendRequest.finishedAt',
      ],
    });
  }

  async getAllUserFriends(id: number): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      relations: [
        'friendRequest',
        'friendRequest.sender',
        'friendRequest.recevier',
      ],
      where: [
        { friendRequest: { sender: { id } } },
        { friendRequest: { recevier: { id } } },
      ],
    });

    const friends = friendships.map(friendship => {
      const { sender, recevier } = friendship.friendRequest;
      return sender.id === id ? recevier : sender;
    });

    return Array.from(new Map(friends.map(friend => [friend.id, friend])).values());
  }

  async getAllCommonUsersFriends(id1: number, id2: number): Promise<User[]> {
    const friends1 = await this.getAllUserFriends(id1);
    const friends2 = await this.getAllUserFriends(id2);
    const commonFriends = friends1.filter(friend1 =>
      friends2.some(friend2 => friend1.id === friend2.id)
    );
  
    return commonFriends;
  }

  async getAllFriendshipRequests(): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find();
  }

  async getAllFriendshipRequestsByUser(id: number): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find({ where: [
      { sender: { id } },
      { recevier: { id } },
    ],
    });
  }

  async getAllFriendshipRequestsSendedByUser(id: number): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find({ where: {sender: { id }}});
  }

  async getAllFriendshipRequestsReceivedByUser(id: number): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find({ where: {recevier: { id }}});
  }

  async checkIfUsersAreFriends(id1: number, id2: number): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      relations: ['friendRequest', 'friendRequest.sender', 'friendRequest.recevier'],
      where: [
        { friendRequest: { sender: { id: id1 }, recevier: { id: id2 } } },
        { friendRequest: { sender: { id: id2 }, recevier: { id: id1 } } },
      ],
    });

    return !!friendship;
  }

  async getFriendCount(userId: number): Promise<number> {
    const count = await this.friendshipRepository.count({
      where: [
        { friendRequest: { sender: { id: userId } } },
        { friendRequest: { recevier: { id: userId } } },
      ],
    });

    return count;
  }

  async checkIfFriendRequestExists(userId1: number, userId2: number): Promise<boolean> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: userId1 }, recevier: { id: userId2 } },
        { sender: { id: userId2 }, recevier: { id: userId1 } },
      ],
    });

    return !!friendRequest;
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
