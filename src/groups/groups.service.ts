import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Group } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestFromGroup } from './entities/request-from-group.entity';
import { RequestToGroup } from './entities/request-to-group.entity';
import { GroupRolesLog } from './entities/group-log.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupMessage } from './entities/group-message.entity';
import { MessageMention } from './entities/message-mention.entity';
import { User } from 'src/users/entities/user.entity';
import { GroupsUserRole, RequestStatus } from 'src/common/enums';

@Injectable()
export class GroupsService {
    constructor(
      @InjectRepository(Group)
      private readonly groupRepository: Repository<Group>,
  
      @InjectRepository(RequestFromGroup)
      private readonly requestFromGroupRepository: Repository<RequestFromGroup>,

      @InjectRepository(RequestToGroup)
      private readonly requestToGroupRepository: Repository<RequestToGroup>,

      @InjectRepository(GroupRolesLog)
      private readonly groupRolesLogRepository: Repository<GroupRolesLog>,

      @InjectRepository(GroupMember)
      private readonly groupMemberRepository: Repository<GroupMember>,

      @InjectRepository(GroupMessage)
      private readonly groupMessageRepository: Repository<GroupMessage>,

      @InjectRepository(MessageMention)
      private readonly messageMentionRepository: Repository<MessageMention>,
    ) {}

  groupsHealthcheck(): object {
    return {message: "Groups Controller is running!"};
  }
  // ---------------------------------- Create Methods -------------------------------------
  async createGroup(userId: number, createGroupDto: CreateGroupDto) : Promise<Group> {
    const founder = await this.groupMemberRepository.manager.findOne(User, {where: {id: userId}});
    if (!founder) {
      throw new NotFoundException(`User with id ${userId} not found!`);
    }

    const group = this.groupRepository.create(createGroupDto);
    await this.groupRepository.save(group);

    const groupMember = this.groupMemberRepository.create({
      group: group, 
      user: founder, 
      role: GroupsUserRole.Founder
    });
    await this.groupMemberRepository.save(groupMember);

    const roleLog = this.groupRolesLogRepository.create({
      group: group, 
      actor: groupMember,
      target: groupMember,
      newRole: GroupsUserRole.Founder
    });
    await this.groupRolesLogRepository.save(roleLog);

    return group;
  }
  async sendJoinRequestToGroup(userId: number, groupId: number) : Promise<RequestToGroup> {
    const group = await this.getGroupById(groupId);
    const sender = await this.requestToGroupRepository.manager.findOne(User, {where: {id: userId}});
    if (!sender) {
      throw new NotFoundException(`User with id ${userId} not found!`);
    }

    const userGroups = await this.getUserGroups(userId);

    if (userGroups.some((userGroup) => userGroup.id === group.id)) {
      throw new ConflictException(`User with id ${userId} is already in this group!`);
    }

    const existingRequest = await this.requestToGroupRepository.findOne({
      where: {
        sender: { id: userId },
        group: { id: groupId },
        requestStatus: RequestStatus.Opened,
      },
    });

    if (existingRequest) {
      throw new ForbiddenException(`An open join request to group ${groupId} already exists for user ${userId}!`);
    }

    const joinRequest = this.requestToGroupRepository.create({sender, group});
    return await this.requestToGroupRepository.save(joinRequest);
  }

  async sendJoinRequestFromGroup(senderId: number, groupId: number, receiverId: number) : Promise<RequestFromGroup> {
    const sender = await this.getGroupMemberByGroupAndUser(groupId, senderId);
    
    if (sender.role === GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can send join requests from group!');
    }

    const receiver = await this.requestFromGroupRepository.manager.findOne(User, {where: {id: receiverId}});
    if (!receiver) {
      throw new NotFoundException(`Receiver with id ${receiverId} not found!`);
    }

    const userGroups = await this.getUserGroups(receiverId);

    if (userGroups.some((userGroup) => userGroup.id === sender.group.id)) {
      throw new ConflictException(`User with id ${receiverId} is already in this group!`);
    }

    const existingRequest = await this.requestFromGroupRepository.findOne({
      where: {
        receiver: { id: receiverId },
        sender: { group: {id: groupId}},
        requestStatus: RequestStatus.Opened,
      },
    });

    if (existingRequest) {
      throw new ForbiddenException(`An open join request from group ${groupId} already exists for user ${receiverId}!`);
    }

    const joinRequest = this.requestFromGroupRepository.create({sender, receiver});
    return await this.requestFromGroupRepository.save(joinRequest);
  }
  // ---------------------------------- Create Methods -------------------------------------
  // ---------------------------------- Update Methods -------------------------------------
  async acceptJoinRequestToGroup(userId: number, requestToGroupId: number) {
    const requestToGroup = await this.getRequestToGroupById(requestToGroupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(requestToGroup.group.id, userId);

    if (requestToGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only accept opened requests to group!');
    }

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can accept opened requests to group!');
    }


    requestToGroup.requestStatus = RequestStatus.Accepted;
    requestToGroup.finishedAt = new Date();
    requestToGroup.actor = groupMember;

    await this.requestToGroupRepository.save(requestToGroup);

    const user = requestToGroup.sender;
    const group = requestToGroup.group;
    const newMember = this.groupMemberRepository.create({group, user, role: GroupsUserRole.Member});
    await this.groupMemberRepository.save(newMember);
  }

  async acceptAllJoinRequestToGroup(userId: number, groupId: number) {
    const requestsToGroup = await this.getRequestsToGroupByGroupId(groupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(groupId, userId);

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can accept opened requests to group!');
    }

    for (const requestToGroup of requestsToGroup) {
      if (requestToGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestToGroup.requestStatus = RequestStatus.Accepted;
      requestToGroup.finishedAt = new Date();
      requestToGroup.actor = groupMember;

      await this.requestToGroupRepository.save(requestToGroup);

      const user = requestToGroup.sender;
      const group = requestToGroup.group;
      const newMember = this.groupMemberRepository.create({group, user, role: GroupsUserRole.Member});
      await this.groupMemberRepository.save(newMember);
    }
  }

  async acceptJoinRequestFromGroup(requestFromGroupId: number, userId?: number) {
    const requestFromGroup = await this.getRequestFromGroupById(requestFromGroupId);

    if (requestFromGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only accept opened requests to group!');
    }

    // Перевірка, що тільки отримувач може прийняти запит
    if (userId && requestFromGroup.receiver.id !== userId) {
      throw new ForbiddenException('You can only accept requests sent to you!');
    }

    requestFromGroup.requestStatus = RequestStatus.Accepted;
    requestFromGroup.finishedAt = new Date();

    await this.requestFromGroupRepository.save(requestFromGroup);

    const group = requestFromGroup.sender.group;
    const user = requestFromGroup.receiver;
    const newMember = this.groupMemberRepository.create({group, user, role: GroupsUserRole.Member});
    await this.groupMemberRepository.save(newMember);
  }

  async acceptAllJoinRequestFromGroups(userId: number) {
    const requestsFromGroups = await this.getRequestsFromGroupByUserId(userId);

    for (const requestFromGroup of requestsFromGroups) {
      if (requestFromGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestFromGroup.requestStatus = RequestStatus.Accepted;
      requestFromGroup.finishedAt = new Date();
      await this.requestFromGroupRepository.save(requestFromGroup);

      const user = requestFromGroup.receiver;
      const group = requestFromGroup.sender.group;
      const newMember = this.groupMemberRepository.create({group, user, role: GroupsUserRole.Member});
      await this.groupMemberRepository.save(newMember);
    }
  }

  async declineJoinRequestToGroup(userId: number, requestToGroupId: number) {
    const requestToGroup = await this.getRequestToGroupById(requestToGroupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(requestToGroup.group.id, userId);

    if (requestToGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only decline opened requests to group!');
    }

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can decline opened requests to group!');
    }


    requestToGroup.requestStatus = RequestStatus.Declined;
    requestToGroup.finishedAt = new Date();
    requestToGroup.actor = groupMember;

    await this.requestToGroupRepository.save(requestToGroup);
  }

  async declineAllJoinRequestToGroup(userId: number, groupId: number) {
    const requestsToGroup = await this.getRequestsToGroupByGroupId(groupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(groupId, userId);

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can decline opened requests to group!');
    }

    for (const requestToGroup of requestsToGroup) {
      if (requestToGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestToGroup.requestStatus = RequestStatus.Declined;
      requestToGroup.finishedAt = new Date();
      requestToGroup.actor = groupMember;

      await this.requestToGroupRepository.save(requestToGroup);
    }
  }

  async declineJoinRequestFromGroup(requestFromGroupId: number, userId?: number) {
    const requestFromGroup = await this.getRequestFromGroupById(requestFromGroupId);

    if (requestFromGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only decline opened requests to group!');
    }

    // Перевірка, що тільки отримувач може відхилити запит
    if (userId && requestFromGroup.receiver.id !== userId) {
      throw new ForbiddenException('You can only decline requests sent to you!');
    }

    requestFromGroup.requestStatus = RequestStatus.Declined;
    requestFromGroup.finishedAt = new Date();

    await this.requestFromGroupRepository.save(requestFromGroup);
  }

  async declineAllJoinRequestFromGroups(userId: number) {
    const requestsFromGroups = await this.getRequestsFromGroupByUserId(userId);

    for (const requestFromGroup of requestsFromGroups) {
      if (requestFromGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestFromGroup.requestStatus = RequestStatus.Declined;
      requestFromGroup.finishedAt = new Date();
      await this.requestFromGroupRepository.save(requestFromGroup);
    }
  }


  async cancelJoinRequestToGroup(requestToGroupId: number, userId?: number) {
    const requestToGroup = await this.getRequestToGroupById(requestToGroupId);

    if (requestToGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only cancel opened requests to group!');
    }

    if (userId && requestToGroup.sender.id !== userId) {
      throw new ForbiddenException('You can only cancel requests that you sent!');
    }

    requestToGroup.requestStatus = RequestStatus.Canceled;
    requestToGroup.finishedAt = new Date();

    await this.requestToGroupRepository.save(requestToGroup);
  }

  async cancelAllJoinRequestToGroupsByUser(userId: number) {
    const requestsToGroup = await this.getRequestsToGroupByUserId(userId);

    for (const requestToGroup of requestsToGroup) {
      if (requestToGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestToGroup.requestStatus = RequestStatus.Canceled;
      requestToGroup.finishedAt = new Date();

      await this.requestToGroupRepository.save(requestToGroup);
    }
  }

  async cancelJoinRequestFromGroup(userId: number, requestFromGroupId: number) {
    const requestFromGroup = await this.getRequestFromGroupById(requestFromGroupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(requestFromGroup.sender.group.id, userId);


    if (requestFromGroup.requestStatus != RequestStatus.Opened) {
      throw new ForbiddenException('You can only cancel opened requests to group!');
    }

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can decline opened requests to group!');
    }

    requestFromGroup.requestStatus = RequestStatus.Canceled;
    requestFromGroup.finishedAt = new Date();
    requestFromGroup.canceledBy = groupMember;

    await this.requestFromGroupRepository.save(requestFromGroup);
  }

  async cancelAllJoinRequestFromGroups(userId: number, groupId: number) {
    const requestsFromGroups = await this.getRequestsFromGroupByGroupId(groupId);
    const groupMember = await this.getGroupMemberByGroupAndUser(groupId, userId);

    if (groupMember.role == GroupsUserRole.Member) {
      throw new ForbiddenException('Only admins can decline opened requests to group!');
    }

    for (const requestFromGroup of requestsFromGroups) {
      if (requestFromGroup.requestStatus != RequestStatus.Opened) {
        continue;
      }

      requestFromGroup.requestStatus = RequestStatus.Canceled;
      requestFromGroup.finishedAt = new Date();
      requestFromGroup.canceledBy = groupMember;

      await this.requestFromGroupRepository.save(requestFromGroup);
    }
  }
  // ---------------------------------- Update Methods -------------------------------------
  // ---------------------------------- Delete Methods -------------------------------------
  async deleteGroup(id: number) {
    const group = await this.getGroupById(id);
    await this.groupRepository.delete(id);
  }

  async deleteGroupMember(userId: number, groupId: number, requesterId?: number) {
    const groupMember = await this.getGroupMemberByGroupAndUser(groupId, userId);
    if (requesterId) {
      if (userId === requesterId) {
        await this.groupMemberRepository.remove(groupMember);
        return;
      }
      const requester = await this.getGroupMemberByGroupAndUser(groupId, requesterId);
      if (requester.role === GroupsUserRole.Member) {
        throw new ForbiddenException('Only admins can remove other members from group!');
      }
      if (groupMember.role === GroupsUserRole.Founder) {
        throw new ForbiddenException('Cannot remove group founder!');
      }
    }
    await this.groupMemberRepository.remove(groupMember);
  }
  // ---------------------------------- Delete Methods -------------------------------------
  // ---------------------------------- Get Methods ----------------------------------------
  async getUserGroups(id: number): Promise<Group[]> {
    return this.groupRepository
      .createQueryBuilder('group')
      .innerJoin('group.members', 'member')
      .innerJoin('member.user', 'user')
      .where('user.id = :userId', { userId: id })
      .leftJoinAndSelect('group.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'memberUser')
      .getMany();
  }

  async getGroupById(groupId: number) : Promise<Group> {
    const group = await this.groupRepository.findOne({where: {id: groupId}});
    if (!group) {
      throw new NotFoundException("Group not found!");
    }
    return group;
  }

  async getGroupMemberByGroupAndUser(groupId: number, userId: number) : Promise<GroupMember> {
    const group = await this.groupRepository.findOne({where: {id: groupId}});
    if (!group) {
      throw new NotFoundException("Group not found!");
    }
    const user = await this.groupMemberRepository.manager.findOne(User, {where: {id: userId}});
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found!`);
    }
    const groupMember = await this.groupMemberRepository.findOne({
      where: {group: {id: groupId}, user: {id: userId}},
      relations: ['group', 'user'],
    });
    if (!groupMember) {
      throw new ForbiddenException(`User with id ${userId} is not a member of group ${groupId}!`);
    }
    return groupMember;
  }

  async getRequestToGroupById(id: number) : Promise<RequestToGroup> {
    const requestToGroup = await this.requestToGroupRepository.findOne({
      where: {id},
      relations: ['sender', 'group', 'actor'],
    });
    if (!requestToGroup) {
      throw new NotFoundException("Request to group not found!");
    }
    return requestToGroup;
  }

  async getRequestFromGroupById(id: number) : Promise<RequestFromGroup> {
    const requestFromGroup = await this.requestFromGroupRepository.findOne({
      where: {id},
      relations: ['sender', 'sender.group', 'receiver', 'canceledBy'],
    });
    if (!requestFromGroup) {
      throw new NotFoundException("Request from group not found!");
    }
    return requestFromGroup;
  }

  async getRequestsToGroupByGroupId(id: number) : Promise<RequestToGroup[]> {
    const requestToGroup = await this.requestToGroupRepository.find({
      where: {group: {id: id}},
      relations: ['sender', 'group', 'actor'],
    });
    if (!requestToGroup) {
      throw new NotFoundException("Request to group not found!");
    }
    return requestToGroup;
  }

  async getRequestsToGroupByUserId(id: number) : Promise<RequestToGroup[]> {
    const requestToGroup = await this.requestToGroupRepository.find({
      where: {sender: {id: id}},
      relations: ['sender', 'group', 'actor'],
    });
    if (!requestToGroup) {
      throw new NotFoundException("Request to group not found!");
    }
    return requestToGroup;
  }

  async getRequestsFromGroupByUserId(id: number) : Promise<RequestFromGroup[]> {
    const requestToGroup = await this.requestFromGroupRepository.find({
      where: {receiver: {id: id}},
      relations: ['sender', 'sender.group', 'receiver', 'canceledBy'],
    });
    if (!requestToGroup) {
      throw new NotFoundException("Request to group not found!");
    }
    return requestToGroup;
  }

  async getRequestsFromGroupByGroupId(id: number) : Promise<RequestFromGroup[]> {
    const requestFromGroup = await this.requestFromGroupRepository.find({
      where: {sender: {group: {id: id}}},
      relations: ['sender', 'sender.group', 'receiver', 'canceledBy'],
    });
    if (!requestFromGroup) {
      throw new NotFoundException("Request from group not found!");
    }
    return requestFromGroup;
  }
  // ---------------------------------- Get Methods ----------------------------------------
}
