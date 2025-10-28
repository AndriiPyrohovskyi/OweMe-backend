import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OwesService } from './owes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators';
import { User } from 'src/users/entities/user.entity';
import { CreateOweDto } from './dto/create-owe.dto';
import { AddParticipantDto } from './dto/add-partipicipant.dto';
import { ReturnOweDto } from './dto/return-owe.dto';
import { UpdateOweDto, UpdateOweItemDto, UpdateOweParticipantDto } from './dto/update-owe.dto';
import { FullOwe } from './entities/full-owe.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';

@Controller('owes')
export class OwesController {
  constructor(private readonly owesService: OwesService) {}

  @Get('healthcheck')
  owesHealthcheck(): object {
    return this.owesService.owesHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  
  @Get('full')
  @UseGuards(JwtAuthGuard)
  async getAllFullOwes(): Promise<FullOwe[]> {
    return this.owesService.getAllFullOwes();
  }

  @Get('full/:id')
  @UseGuards(JwtAuthGuard)
  async getFullOwe(@Param('id') id: number): Promise<FullOwe> {
    return this.owesService.getFullOwe(id);
  }

  @Get('full/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getAllFullOwesByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllFullOwesByUser(userId);
  }

  @Get('full/my')
  @UseGuards(JwtAuthGuard)
  async getMyFullOwes(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllFullOwesByUser(currentUser.id);
  }

  @Get('full/group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getAllFullOwesByGroup(@Param('groupId') groupId: number): Promise<FullOwe[]> {
    return this.owesService.getAllFullOwesByGroup(groupId);
  }

  @Get('full/group/:groupId/member/:userId')
  @UseGuards(JwtAuthGuard)
  async getAllFullOwesByGroupMember(
    @Param('groupId') groupId: number,
    @Param('userId') userId: number
  ): Promise<object> {
    return this.owesService.getAllFullOwesByGroupMember(userId, groupId);
  }

  @Get('items')
  @UseGuards(JwtAuthGuard)
  async getAllOweItems(): Promise<OweItem[]> {
    return this.owesService.getAllOweItems();
  }

  @Get('items/:id')
  @UseGuards(JwtAuthGuard)
  async getOweItem(@Param('id') id: number): Promise<OweItem> {
    return this.owesService.getOweItem(id);
  }

  @Get('items/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getAllOweItemsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweItemsByUser(userId);
  }

  @Get('items/my')
  @UseGuards(JwtAuthGuard)
  async getMyOweItems(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweItemsByUser(currentUser.id);
  }

  @Get('items/group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getAllOweItemsByGroup(@Param('groupId') groupId: number): Promise<OweItem[]> {
    return this.owesService.getAllOweItemsByGroup(groupId);
  }

  @Get('participants')
  @UseGuards(JwtAuthGuard)
  async getAllOweParticipants(): Promise<OweParticipant[]> {
    return this.owesService.getAllOweParticipant();
  }

  @Get('participants/:id')
  @UseGuards(JwtAuthGuard)
  async getOweParticipant(@Param('id') id: number): Promise<OweParticipant> {
    return this.owesService.getOweParticipant(id);
  }

  @Get('participants/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getAllOweParticipantsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweParticipantsByUser(userId);
  }

  @Get('participants/my')
  @UseGuards(JwtAuthGuard)
  async getMyOweParticipants(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweParticipantsByUser(currentUser.id);
  }

  @Get('participants/group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getAllOweParticipantsByGroup(@Param('groupId') groupId: number): Promise<OweParticipant[]> {
    return this.owesService.getAllOweParticipantsByGroup(groupId);
  }

  @Get('returns')
  @UseGuards(JwtAuthGuard)
  async getAllOweReturns(): Promise<OweReturn[]> {
    return this.owesService.getAllOweReturns();
  }

  @Get('returns/:id')
  @UseGuards(JwtAuthGuard)
  async getOweReturn(@Param('id') id: number): Promise<OweReturn> {
    return this.owesService.getOweReturn(id);
  }

  @Get('returns/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getAllOweReturnsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweReturnsByUser(userId);
  }

  @Get('returns/my')
  @UseGuards(JwtAuthGuard)
  async getMyOweReturns(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweReturnsByUser(currentUser.id);
  }

  @Get('returns/group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getAllOweReturnsByGroup(@Param('groupId') groupId: number): Promise<OweReturn[]> {
    return this.owesService.getAllOweReturnsByGroup(groupId);
  }

  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post ------------------------------------
  
  @Post('full/create')
  @UseGuards(JwtAuthGuard)
  async createFullOwe(@Body() createOweDto: CreateOweDto): Promise<FullOwe> {
    return this.owesService.createFullOwe(createOweDto);
  }

  @Post('items/:fullOweId')
  @UseGuards(JwtAuthGuard)
  async createOweItem(
    @Param('fullOweId') fullOweId: number,
    @Body() itemDto: any
  ): Promise<OweItem> {
    return this.owesService.createOweItem(fullOweId, itemDto);
  }

  @Post('participants/add')
  @UseGuards(JwtAuthGuard)
  async addParticipant(@Body() addParticipantDto: AddParticipantDto): Promise<OweParticipant> {
    return this.owesService.addParticipant(addParticipantDto);
  }

  @Post('returns/create')
  @UseGuards(JwtAuthGuard)
  async createOweReturn(@Body() returnOweDto: ReturnOweDto): Promise<OweReturn> {
    return this.owesService.createOweReturn(returnOweDto);
  }

  // ---------------------------------- Post ------------------------------------

  // ---------------------------------- Put -------------------------------------
  
  @Put('full/:id')
  @UseGuards(JwtAuthGuard)
  async updateFullOwe(
    @Param('id') id: number,
    @Body() updateOweDto: UpdateOweDto
  ): Promise<FullOwe> {
    return this.owesService.updateFullOwe(id, updateOweDto);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  async updateOweItem(
    @Param('id') id: number,
    @Body() updateOweItemDto: UpdateOweItemDto
  ): Promise<OweItem> {
    return this.owesService.updateOweItem(id, updateOweItemDto);
  }

  @Put('participants/:id')
  @UseGuards(JwtAuthGuard)
  async updateOweParticipant(
    @Param('id') id: number,
    @Body() updateDto: UpdateOweParticipantDto
  ): Promise<OweParticipant> {
    return this.owesService.updateOweParticipant(id, updateDto);
  }

  // Status management endpoints for FullOwe (для відкриття боргу)
  @Put('full/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelFullOwe(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FullOwe> {
    return this.owesService.cancelFullOwe(id, currentUser.id);
  }

  @Put('full/:id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptFullOwe(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FullOwe> {
    return this.owesService.acceptFullOwe(id, currentUser.id);
  }

  @Put('full/:id/decline')
  @UseGuards(JwtAuthGuard)
  async declineFullOwe(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<FullOwe> {
    return this.owesService.declineFullOwe(id, currentUser.id);
  }

  // Status management endpoints for OweItem
  @Put('items/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOweItem(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweItem> {
    return this.owesService.cancelOweItem(id, currentUser.id);
  }

  @Put('items/:id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptOweItem(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweItem> {
    return this.owesService.acceptOweItem(id, currentUser.id);
  }

  @Put('items/:id/decline')
  @UseGuards(JwtAuthGuard)
  async declineOweItem(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweItem> {
    return this.owesService.declineOweItem(id, currentUser.id);
  }

  // Status management endpoints for OweReturn (для повернення)
  @Put('returns/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.cancelOweReturn(id, currentUser.id);
  }

  @Put('returns/:id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.acceptOweReturn(id, currentUser.id);
  }

  @Put('returns/:id/decline')
  @UseGuards(JwtAuthGuard)
  async declineOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.declineOweReturn(id, currentUser.id);
  }

  // ---------------------------------- Put -------------------------------------

  // ---------------------------------- Delete ----------------------------------
  
  @Delete('full/:id')
  @UseGuards(JwtAuthGuard)
  async deleteFullOwe(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteFullOwe(id);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  async deleteOweItem(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweItem(id);
  }

  @Delete('participants/:id')
  @UseGuards(JwtAuthGuard)
  async deleteOweParticipant(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweParticipant(id);
  }

  @Delete('returns/:id')
  @UseGuards(JwtAuthGuard)
  async deleteOweReturn(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweReturn(id);
  }

  // ---------------------------------- Delete ----------------------------------
}