import { BadRequestException, Injectable, NotAcceptableException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
  async sendFriendRequest(senderId: number, recevierId: number): Promise<object> {
    if (!recevierId || !senderId) {
      throw new BadRequestException('Not given right variables!');
    }
    if (senderId === recevierId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }
    const sender = await this.friendshipRequestRepository.manager.findOne(User, { where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException(`Sender with id ${senderId} not found`);
    }
    const recevier = await this.friendshipRequestRepository.manager.findOne(User, { where: { id: recevierId } });
    if (!recevier) {
      throw new NotFoundException(`Recevier with id ${recevierId} not found`);
    }
    const existingFriendship = await this.friendshipRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.friendRequest', 'friendRequest')
      .where(
        '(friendRequest.senderId = :senderId AND friendRequest.recevierId = :recevierId) OR ' +
        '(friendRequest.senderId = :recevierId AND friendRequest.recevierId = :senderId)',
        { senderId, recevierId }
      )
      .getOne();

    if (existingFriendship) {
      throw new NotAcceptableException('Users are already friends');
    }
    const activeRequest = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: senderId }, recevier: { id: recevierId }, requestStatus: RequestStatus.Opened },
        { sender: { id: recevierId }, recevier: { id: senderId }, requestStatus: RequestStatus.Opened },
      ],
    });

    if (activeRequest) {
      throw new NotAcceptableException('Friend request already exists and is pending');
    }

    const friendRequest = this.friendshipRequestRepository.create({
      sender: { id: senderId },
      recevier: { id: recevierId },
      requestStatus: RequestStatus.Opened,
    });

    await this.friendshipRequestRepository.save(friendRequest);
  
    return {message: `Friend request sent to ${recevier.username} from ${sender.username} succesfully.`};
  }

  // ---------------------------------- History Methods -------------------------------------
  async getFriendRequestHistory(userId1: number, userId2: number): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find({
      where: [
        { sender: { id: userId1 }, recevier: { id: userId2 } },
        { sender: { id: userId2 }, recevier: { id: userId1 } },
      ],
      relations: ['sender', 'recevier'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllUserRequestHistory(userId: number): Promise<{sent: FriendshipRequest[], received: FriendshipRequest[]}> {
    const sent = await this.friendshipRequestRepository.find({
      where: { sender: { id: userId } },
      relations: ['sender', 'recevier'],
      order: { createdAt: 'DESC' },
    });

    const received = await this.friendshipRequestRepository.find({
      where: { recevier: { id: userId } },
      relations: ['sender', 'recevier'],
      order: { createdAt: 'DESC' },
    });

    return { sent, received };
  }

  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  async acceptFriendRequest(requestId: number, userId?: number): Promise<object> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'recevier'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (userId && friendRequest.recevier.id !== userId) {
      throw new ForbiddenException('You can only accept friend requests sent to you');
    }

    if (friendRequest.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only accept opened friend requests');
    }

    friendRequest.requestStatus = RequestStatus.Accepted;
    friendRequest.finishedAt = new Date();
    await this.friendshipRequestRepository.save(friendRequest);

    const friendship = this.friendshipRepository.create({
      friendRequest,
    });

    await this.friendshipRepository.save(friendship);

    return friendship;
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

  async declineFriendRequest(requestId: number, userId?: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'recevier'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (userId && friendRequest.recevier.id !== userId) {
      throw new ForbiddenException('You can only decline friend requests sent to you');
    }

    if (friendRequest.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can decline only opened friend requests');
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
    }

    return friendships;
  }

  async cancelFriendRequest(requestId: number, userId?: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'recevier'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (userId && friendRequest.sender.id !== userId) {
      throw new ForbiddenException('You can only cancel friend requests that you sent');
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
  async getFriendshipRequestById(id: number): Promise<FriendshipRequest> {
    const friendshipRequest = await this.friendshipRequestRepository.findOne({
      where: { id },
      relations: ['sender', 'recevier'],
    });

    if (!friendshipRequest) {
      throw new NotFoundException(`Friendship request with ID ${id} not found`);
    }

    return friendshipRequest;
  }
  
  async getAllFriendships(): Promise<object[]> {
    const friendships = await this.friendshipRepository.find({
      relations: [
        'friendRequest',
        'friendRequest.sender',
        'friendRequest.recevier',
      ],
    });

    return friendships.map(friendship => ({
      id: friendship.id,
      sender: friendship.friendRequest.sender,
      recevier: friendship.friendRequest.recevier,
      createdAt: friendship.friendRequest.createdAt,
      finishedAt: friendship.friendRequest.finishedAt,
    }));
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

  async getAllFriendshipRequests(): Promise<object[]> {
    const friendshipRequests = await this.friendshipRequestRepository.find({relations: ['sender', 'recevier'],});
    return friendshipRequests.map(request => ({
      id: request.id,
      requestStatus: request.requestStatus,
      createdAt: request.createdAt,
      finishedAt: request.finishedAt,
      sender: {
        id: request.sender.id,
        username: request.sender.username,
        firstName: request.sender.firstName,
        lastName: request.sender.lastName,
      },
      recevier: {
        id: request.recevier.id,
        username: request.recevier.username,
        firstName: request.recevier.firstName,
        lastName: request.recevier.lastName,
      },
    }));
  }

  async getAllFriendshipRequestsByUser(id: number): Promise<object> {
    const [sended, received] = await Promise.all([
      this.getAllFriendshipRequestsSendedByUser(id),
      this.getAllFriendshipRequestsReceivedByUser(id),
    ]);
    return {
      sended,
      received,
    };
  }

  async getAllFriendshipRequestsSendedByUser(id: number): Promise<object[]> {
    const friendshipRequestsByUser = await this.friendshipRequestRepository.find({ 
      where: {sender: { id }},     
      relations: ['sender', 'recevier'],
    });

    return friendshipRequestsByUser.map(request => ({
      id: request.id,
      requestStatus: request.requestStatus,
      createdAt: request.createdAt,
      finishedAt: request.finishedAt,
      user: {
        id: request.recevier.id,
        username: request.recevier.username,
        firstName: request.recevier.firstName,
        lastName: request.recevier.lastName,
      },
    }));
  }

  async getAllFriendshipRequestsReceivedByUser(id: number): Promise<object[]> {
    const friendshipRequestsByUser = await this.friendshipRequestRepository.find({ 
      where: {recevier: { id }},
      relations: ['sender', 'recevier'],
    });

    return friendshipRequestsByUser.map(request => ({
      id: request.id,
      requestStatus: request.requestStatus,
      createdAt: request.createdAt,
      finishedAt: request.finishedAt,
      user: {
        id: request.sender.id,
        username: request.sender.username,
        firstName: request.sender.firstName,
        lastName: request.sender.lastName,
      },
    }));
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
