import { BadRequestException, Injectable, NotAcceptableException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {Repository} from 'typeorm'
import { FriendshipRequest } from './entities/friendship-request.entity';
import { RequestStatus } from 'src/common/enums';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class FriendsService {
  constructor (
    @InjectRepository(FriendshipRequest)
    private readonly friendshipRequestRepository: Repository<FriendshipRequest>,
  ){}
  friendsHealthcheck(): object {
    return {message: "Friends Controller is running!"};
  }
  // ---------------------------------- Create Methods -------------------------------------
  async sendFriendRequest(senderId: number, receiverId: number): Promise<object> {
    if (!receiverId || !senderId) {
      throw new BadRequestException('Not given right variables!');
    }
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }
    const sender = await this.friendshipRequestRepository.manager.findOne(User, { where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException(`Sender with id ${senderId} not found`);
    }
    const receiver = await this.friendshipRequestRepository.manager.findOne(User, { where: { id: receiverId } });
    if (!receiver) {
      throw new NotFoundException(`Receiver with id ${receiverId} not found`);
    }
    
    // Check if they are already friends (accepted request exists)
    const existingFriendship = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId }, requestStatus: RequestStatus.Accepted },
        { sender: { id: receiverId }, receiver: { id: senderId }, requestStatus: RequestStatus.Accepted },
      ],
    });

    if (existingFriendship) {
      throw new NotAcceptableException('Users are already friends');
    }
    
    // Check if there's already a pending request
    const activeRequest = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId }, requestStatus: RequestStatus.Opened },
        { sender: { id: receiverId }, receiver: { id: senderId }, requestStatus: RequestStatus.Opened },
      ],
    });

    if (activeRequest) {
      throw new NotAcceptableException('Friend request already exists and is pending');
    }

    const friendRequest = this.friendshipRequestRepository.create({
      sender: { id: senderId },
      receiver: { id: receiverId },
      requestStatus: RequestStatus.Opened,
    });

    await this.friendshipRequestRepository.save(friendRequest);
  
    return {message: `Friend request sent to ${receiver.username} from ${sender.username} succesfully.`};
  }

  // ---------------------------------- History Methods -------------------------------------
  async getFriendRequestHistory(userId1: number, userId2: number): Promise<FriendshipRequest[]> {
    return await this.friendshipRequestRepository.find({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 } },
        { sender: { id: userId2 }, receiver: { id: userId1 } },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllUserRequestHistory(userId: number): Promise<{sent: FriendshipRequest[], received: FriendshipRequest[]}> {
    const sent = await this.friendshipRequestRepository.find({
      where: { sender: { id: userId } },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });

    const received = await this.friendshipRequestRepository.find({
      where: { receiver: { id: userId } },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });

    return { sent, received };
  }

  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  async acceptFriendRequest(requestId: number, userId?: number): Promise<object> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (userId && friendRequest.receiver.id !== userId) {
      throw new ForbiddenException('You can only accept friend requests sent to you');
    }

    if (friendRequest.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only accept opened friend requests');
    }

    friendRequest.requestStatus = RequestStatus.Accepted;
    friendRequest.finishedAt = new Date();
    friendRequest.acceptedAt = new Date();
    await this.friendshipRequestRepository.save(friendRequest);

    return friendRequest;
  }

  async acceptAllFriendRequestsByUser(userId: number): Promise<FriendshipRequest[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { receiver: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'receiver'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const acceptedRequests: FriendshipRequest[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Accepted;
      friendRequest.finishedAt = new Date();
      friendRequest.acceptedAt = new Date();
      acceptedRequests.push(await this.friendshipRequestRepository.save(friendRequest));
    }

    return acceptedRequests;
  }

  async declineFriendRequest(requestId: number, userId?: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship request not found');
    }

    if (userId && friendRequest.receiver.id !== userId) {
      throw new ForbiddenException('You can only decline friend requests sent to you');
    }

    if (friendRequest.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can decline only opened friend requests');
    }

    friendRequest.requestStatus = RequestStatus.Declined;
    friendRequest.finishedAt = new Date();

    return await this.friendshipRequestRepository.save(friendRequest);
  }

  async declineAllFriendRequestsByUser(userId: number): Promise<FriendshipRequest[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { receiver: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'receiver'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const declinedRequests: FriendshipRequest[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Declined;
      friendRequest.finishedAt = new Date();
      declinedRequests.push(await this.friendshipRequestRepository.save(friendRequest));
    }

    return declinedRequests;
  }

  async cancelFriendRequest(requestId: number, userId?: number): Promise<FriendshipRequest> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
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

  async cancelAllFriendRequestsByUser(userId: number): Promise<FriendshipRequest[]> {
    const friendRequests = await this.friendshipRequestRepository.find({
      where: { sender: { id: userId }, requestStatus: RequestStatus.Opened },
      relations: ['sender', 'receiver'],
    });

    if (friendRequests.length === 0) {
      throw new NotFoundException('No friendship requests found for this user');
    }

    const canceledRequests: FriendshipRequest[] = [];

    for (const friendRequest of friendRequests) {
      friendRequest.requestStatus = RequestStatus.Canceled;
      friendRequest.finishedAt = new Date();
      canceledRequests.push(await this.friendshipRequestRepository.save(friendRequest));
    }

    return canceledRequests;
  }
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  async removeFriend(userId1: number, userId2: number): Promise<void> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      relations: ['sender', 'receiver'],
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 }, requestStatus: RequestStatus.Accepted },
        { sender: { id: userId2 }, receiver: { id: userId1 }, requestStatus: RequestStatus.Accepted },
      ],
    });

    if (!friendRequest) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRequestRepository.remove(friendRequest);
  }
  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getFriendshipRequestById(id: number): Promise<FriendshipRequest> {
    const friendshipRequest = await this.friendshipRequestRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver'],
    });

    if (!friendshipRequest) {
      throw new NotFoundException(`Friendship request with ID ${id} not found`);
    }

    return friendshipRequest;
  }
  
  async getAllFriendships(): Promise<object[]> {
    const friendships = await this.friendshipRequestRepository.find({
      where: { requestStatus: RequestStatus.Accepted },
      relations: ['sender', 'receiver'],
    });

    return friendships.map(friendship => ({
      id: friendship.id,
      sender: friendship.sender,
      receiver: friendship.receiver,
      createdAt: friendship.createdAt,
      finishedAt: friendship.finishedAt,
      acceptedAt: friendship.acceptedAt,
    }));
  }

  async getAllUserFriends(id: number): Promise<User[]> {
    const friendships = await this.friendshipRequestRepository.find({
      where: [
        { sender: { id }, requestStatus: RequestStatus.Accepted },
        { receiver: { id }, requestStatus: RequestStatus.Accepted },
      ],
      relations: ['sender', 'receiver'],
    });

    const friends = friendships.map(friendship => {
      const { sender, receiver } = friendship;
      return sender.id === id ? receiver : sender;
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
    const friendshipRequests = await this.friendshipRequestRepository.find({relations: ['sender', 'receiver'],});
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
      receiver: {
        id: request.receiver.id,
        username: request.receiver.username,
        firstName: request.receiver.firstName,
        lastName: request.receiver.lastName,
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
      relations: ['sender', 'receiver'],
    });

    return friendshipRequestsByUser.map(request => ({
      id: request.id,
      requestStatus: request.requestStatus,
      createdAt: request.createdAt,
      finishedAt: request.finishedAt,
      user: {
        id: request.receiver.id,
        username: request.receiver.username,
        firstName: request.receiver.firstName,
        lastName: request.receiver.lastName,
      },
    }));
  }

  async getAllFriendshipRequestsReceivedByUser(id: number): Promise<object[]> {
    const friendshipRequestsByUser = await this.friendshipRequestRepository.find({ 
      where: {receiver: { id }},
      relations: ['sender', 'receiver'],
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
    const friendship = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: id1 }, receiver: { id: id2 }, requestStatus: RequestStatus.Accepted },
        { sender: { id: id2 }, receiver: { id: id1 }, requestStatus: RequestStatus.Accepted },
      ],
    });

    return !!friendship;
  }

  async getFriendCount(userId: number): Promise<number> {
    const count = await this.friendshipRequestRepository.count({
      where: [
        { sender: { id: userId }, requestStatus: RequestStatus.Accepted },
        { receiver: { id: userId }, requestStatus: RequestStatus.Accepted },
      ],
    });

    return count;
  }

  async checkIfFriendRequestExists(userId1: number, userId2: number): Promise<boolean> {
    const friendRequest = await this.friendshipRequestRepository.findOne({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 } },
        { sender: { id: userId2 }, receiver: { id: userId1 } },
      ],
    });

    return !!friendRequest;
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
