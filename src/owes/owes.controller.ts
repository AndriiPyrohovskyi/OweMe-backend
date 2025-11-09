import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { OwesService } from './owes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OweAccessGuard } from 'src/auth/guards/owe-access.guard';
import { CurrentUser, Roles, TargetUserField } from 'src/common/decorators';
import { User } from 'src/users/entities/user.entity';
import { CreateOweDto } from './dto/create-owe.dto';
import { AddParticipantDto } from './dto/add-partipicipant.dto';
import { ReturnOweDto } from './dto/return-owe.dto';
import { UpdateOweDto, UpdateOweItemDto, UpdateOweParticipantDto } from './dto/update-owe.dto';
import { FullOwe } from './entities/full-owe.entity';
import { OweItem } from './entities/owe-item.entity';
import { OweParticipant } from './entities/owe-partipicipant.entity';
import { OweReturn } from './entities/owe-return.entity';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/common/enums';
import { GroupMemberOrAdminGuard } from 'src/auth/guards/group-member-or-admin.guard';
import { OweOwnerGuard } from 'src/auth/guards/owe-owner.guard';
import { ParticipantUserGuard } from 'src/auth/guards/participant-user.guard';

@ApiTags('owes')
@ApiBearerAuth()
@Controller('owes')
export class OwesController {
  constructor(private readonly owesService: OwesService) {}

  @Get('healthcheck')
  @ApiOperation({ summary: 'Перевірка стану Owes сервісу' })
  @ApiResponse({ status: 200, description: 'Сервіс працює' })
  owesHealthcheck(): object {
    return this.owesService.owesHealthcheck();
  }

  // ---------------------------------- Get -------------------------------------
  
  @Get('full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всі повні борги' })
  @ApiResponse({ status: 200, description: 'Список всіх боргів', type: [FullOwe] })
  async getAllFullOwes(): Promise<FullOwe[]> {
    return this.owesService.getAllFullOwes();
  }

  @Get('full/user/:userId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('userId')
  @ApiOperation({ summary: 'Отримати всі борги користувача (надіслані та отримані)' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Об\'єкт з надісланими та отриманими боргами' })
  async getAllFullOwesByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllFullOwesByUser(userId);
  }

  @Get('full/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої борги' })
  @ApiResponse({ status: 200, description: 'Мої борги (надіслані та отримані)' })
  async getMyFullOwes(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllFullOwesByUser(currentUser.id);
  }

  @Get('full/group/:groupId')
  @UseGuards(JwtAuthGuard, GroupMemberOrAdminGuard)
  @ApiOperation({ summary: 'Отримати всі борги групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Список боргів групи', type: [FullOwe] })
  async getAllFullOwesByGroup(@Param('groupId') groupId: number): Promise<FullOwe[]> {
    return this.owesService.getAllFullOwesByGroup(groupId);
  }

  @Get('full/group/:groupId/member/:userId')
  @UseGuards(JwtAuthGuard, GroupMemberOrAdminGuard)
  @ApiOperation({ summary: 'Отримати борги учасника групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Борги учасника в групі' })
  async getAllFullOwesByGroupMember(
    @Param('groupId') groupId: number,
    @Param('userId') userId: number
  ): Promise<object> {
    return this.owesService.getAllFullOwesByGroupMember(userId, groupId);
  }

  @Get('full/:id')
  @UseGuards(JwtAuthGuard, OweAccessGuard)
  @ApiOperation({ summary: 'Отримати повний борг за ID' })
  @ApiParam({ name: 'id', description: 'ID боргу' })
  @ApiResponse({ status: 200, description: 'Інформація про борг', type: FullOwe })
  @ApiResponse({ status: 404, description: 'Борг не знайдений' })
  @ApiResponse({ status: 403, description: 'Немає доступу до цього боргу' })
  async getFullOwe(@Param('id') id: number): Promise<FullOwe> {
    return this.owesService.getFullOwe(id);
  }

  @Get('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всі пункти боргів' })
  @ApiResponse({ status: 200, description: 'Список всіх пунктів боргів', type: [OweItem] })
  async getAllOweItems(): Promise<OweItem[]> {
    return this.owesService.getAllOweItems();
  }

  @Get('items/user/:userId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('userId')
  @ApiOperation({ summary: 'Отримати пункти боргів користувача' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Пункти боргів користувача' })
  async getAllOweItemsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweItemsByUser(userId);
  }

  @Get('items/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої пункти боргів' })
  @ApiResponse({ status: 200, description: 'Мої пункти боргів' })
  async getMyOweItems(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweItemsByUser(currentUser.id);
  }

  @Get('items/group/:groupId')
  @UseGuards(JwtAuthGuard, GroupMemberOrAdminGuard)
  @ApiOperation({ summary: 'Отримати пункти боргів групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Пункти боргів групи', type: [OweItem] })
  async getAllOweItemsByGroup(@Param('groupId') groupId: number): Promise<OweItem[]> {
    return this.owesService.getAllOweItemsByGroup(groupId);
  }

  @Get('items/:id')
  @UseGuards(JwtAuthGuard, OweAccessGuard)
  @ApiOperation({ summary: 'Отримати пункт боргу за ID' })
  @ApiParam({ name: 'id', description: 'ID пункту боргу' })
  @ApiResponse({ status: 200, description: 'Інформація про пункт боргу', type: OweItem })
  @ApiResponse({ status: 404, description: 'Пункт не знайдений' })
  @ApiResponse({ status: 403, description: 'Немає доступу до цього пункту боргу' })
  async getOweItem(@Param('id') id: number): Promise<OweItem> {
    return this.owesService.getOweItem(id);
  }

  @Get('participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всіх учасників боргів' })
  @ApiResponse({ status: 200, description: 'Список всіх учасників боргів', type: [OweParticipant] })
  async getAllOweParticipants(): Promise<OweParticipant[]> {
    return this.owesService.getAllOweParticipant();
  }

  @Get('participants/user/:userId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('userId')
  @ApiOperation({ summary: 'Отримати участь користувача в боргах' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Участь користувача в боргах' })
  async getAllOweParticipantsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweParticipantsByUser(userId);
  }

  @Get('participants/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мою участь в боргах' })
  @ApiResponse({ status: 200, description: 'Моя участь в боргах' })
  async getMyOweParticipants(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweParticipantsByUser(currentUser.id);
  }

  @Get('participants/group/:groupId')
  @UseGuards(JwtAuthGuard, GroupMemberOrAdminGuard)
  @ApiOperation({ summary: 'Отримати учасників боргів групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Учасники боргів групи', type: [OweParticipant] })
  async getAllOweParticipantsByGroup(@Param('groupId') groupId: number): Promise<OweParticipant[]> {
    return this.owesService.getAllOweParticipantsByGroup(groupId);
  }

  @Get('participants/:id')
  @UseGuards(JwtAuthGuard, OweAccessGuard)
  @ApiOperation({ summary: 'Отримати учасника боргу за ID' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiResponse({ status: 200, description: 'Інформація про учасника', type: OweParticipant })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  @ApiResponse({ status: 403, description: 'Немає доступу до цього учасника' })
  async getOweParticipant(@Param('id') id: number): Promise<OweParticipant> {
    return this.owesService.getOweParticipant(id);
  }

  @Get('returns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Отримати всі повернення боргів' })
  @ApiResponse({ status: 200, description: 'Список всіх повернень', type: [OweReturn] })
  async getAllOweReturns(): Promise<OweReturn[]> {
    return this.owesService.getAllOweReturns();
  }

  @Get('returns/user/:userId')
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @TargetUserField('userId')
  @ApiOperation({ summary: 'Отримати повернення боргів користувача' })
  @ApiParam({ name: 'userId', description: 'ID користувача' })
  @ApiResponse({ status: 200, description: 'Повернення боргів користувача' })
  async getAllOweReturnsByUser(@Param('userId') userId: number): Promise<object> {
    return this.owesService.getAllOweReturnsByUser(userId);
  }

  @Get('returns/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отримати мої повернення боргів' })
  @ApiResponse({ status: 200, description: 'Мої повернення боргів' })
  async getMyOweReturns(@CurrentUser() currentUser: User): Promise<object> {
    return this.owesService.getAllOweReturnsByUser(currentUser.id);
  }

  @Get('returns/group/:groupId')
  @UseGuards(JwtAuthGuard, GroupMemberOrAdminGuard)
  @ApiOperation({ summary: 'Отримати повернення боргів групи' })
  @ApiParam({ name: 'groupId', description: 'ID групи' })
  @ApiResponse({ status: 200, description: 'Повернення боргів групи', type: [OweReturn] })
  async getAllOweReturnsByGroup(@Param('groupId') groupId: number): Promise<OweReturn[]> {
    return this.owesService.getAllOweReturnsByGroup(groupId);
  }

  @Get('returns/:id')
  @UseGuards(JwtAuthGuard, OweAccessGuard)
  @ApiOperation({ summary: 'Отримати повернення боргу за ID' })
  @ApiParam({ name: 'id', description: 'ID повернення' })
  @ApiResponse({ status: 200, description: 'Інформація про повернення', type: OweReturn })
  @ApiResponse({ status: 404, description: 'Повернення не знайдене' })
  @ApiResponse({ status: 403, description: 'Немає доступу до цього повернення' })
  async getOweReturn(@Param('id') id: number): Promise<OweReturn> {
    return this.owesService.getOweReturn(id);
  }

  // ---------------------------------- Get -------------------------------------

  // ---------------------------------- Post ------------------------------------
  
  @Post('full')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Створити повний борг' })
  @ApiBody({ type: CreateOweDto, description: 'Дані для створення боргу' })
  @ApiResponse({ status: 201, description: 'Борг успішно створений', type: FullOwe })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async createFullOwe(@Body() createOweDto: CreateOweDto): Promise<FullOwe> {
    return this.owesService.createFullOwe(createOweDto);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Створити пункт боргу' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        fullOweId: { type: 'number', description: 'ID повного боргу' },
        itemDto: { type: 'object', description: 'Дані пункту боргу' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Пункт боргу успішно створений', type: OweItem })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async createOweItem(@Body() body: { fullOweId: number; itemDto: any }): Promise<OweItem> {
    return this.owesService.createOweItem(body.fullOweId, body.itemDto);
  }

  @Post('participants')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Додати учасника до боргу' })
  @ApiBody({ type: AddParticipantDto, description: 'Дані для додавання учасника' })
  @ApiResponse({ status: 201, description: 'Учасник успішно доданий', type: OweParticipant })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async addParticipant(@Body() addParticipantDto: AddParticipantDto): Promise<OweParticipant> {
    return this.owesService.addParticipant(addParticipantDto);
  }

  @Post('returns')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Створити повернення боргу' })
  @ApiBody({ type: ReturnOweDto, description: 'Дані для створення повернення' })
  @ApiResponse({ status: 201, description: 'Повернення успішно створене', type: OweReturn })
  @ApiResponse({ status: 400, description: 'Невірні дані' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async createOweReturn(@Body() returnOweDto: ReturnOweDto, @CurrentUser() currentUser: User): Promise<OweReturn> {
    return this.owesService.createOweReturn(returnOweDto, currentUser.id);
  }

  // ---------------------------------- Post ------------------------------------

  // ---------------------------------- Put -------------------------------------
  
  @Put('full/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Оновити повний борг' })
  @ApiParam({ name: 'id', description: 'ID боргу' })
  @ApiBody({ type: UpdateOweDto, description: 'Дані для оновлення боргу' })
  @ApiResponse({ status: 200, description: 'Борг успішно оновлений', type: FullOwe })
  @ApiResponse({ status: 404, description: 'Борг не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async updateFullOwe(
    @Param('id') id: number,
    @Body() updateOweDto: UpdateOweDto
  ): Promise<FullOwe> {
    return this.owesService.updateFullOwe(id, updateOweDto);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Оновити пункт боргу' })
  @ApiParam({ name: 'id', description: 'ID пункту боргу' })
  @ApiBody({ type: UpdateOweItemDto, description: 'Дані для оновлення пункту' })
  @ApiResponse({ status: 200, description: 'Пункт успішно оновлений', type: OweItem })
  @ApiResponse({ status: 404, description: 'Пункт не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async updateOweItem(
    @Param('id') id: number,
    @Body() updateOweItemDto: UpdateOweItemDto
  ): Promise<OweItem> {
    return this.owesService.updateOweItem(id, updateOweItemDto);
  }

  @Put('participants/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Оновити учасника боргу' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiBody({ type: UpdateOweParticipantDto, description: 'Дані для оновлення учасника' })
  @ApiResponse({ status: 200, description: 'Учасник успішно оновлений', type: OweParticipant })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async updateOweParticipant(
    @Param('id') id: number,
    @Body() updateDto: UpdateOweParticipantDto
  ): Promise<OweParticipant> {
    return this.owesService.updateOweParticipant(id, updateDto);
  }

  // Status management endpoints for OweParticipant
  @Put('participants/:id/cancel')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Скасувати учасника боргу (тільки власник)' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiResponse({ status: 200, description: 'Учасника успішно скасовано', type: OweParticipant })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  async cancelOweParticipant(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweParticipant> {
    return this.owesService.cancelOweParticipant(id, currentUser.id);
  }

  @Put('participants/:id/accept')
  @UseGuards(JwtAuthGuard, ParticipantUserGuard)
  @ApiOperation({ summary: 'Прийняти борг (тільки учасник)' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiResponse({ status: 200, description: 'Борг успішно прийнятий', type: OweParticipant })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  async acceptOweParticipant(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweParticipant> {
    return this.owesService.acceptOweParticipant(id, currentUser.id);
  }

  @Put('participants/:id/decline')
  @UseGuards(JwtAuthGuard, ParticipantUserGuard)
  @ApiOperation({ summary: 'Відхилити борг (тільки учасник)' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiResponse({ status: 200, description: 'Борг успішно відхилений', type: OweParticipant })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  async declineOweParticipant(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweParticipant> {
    return this.owesService.declineOweParticipant(id, currentUser.id);
  }

  // Status management endpoints for OweReturn (для повернення)
  @Put('returns/:id/cancel')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Скасувати повернення боргу (тільки учасник боргу)' })
  @ApiParam({ name: 'id', description: 'ID повернення' })
  @ApiResponse({ status: 200, description: 'Повернення успішно скасоване', type: OweReturn })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Повернення не знайдене' })
  async cancelOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.cancelOweReturn(id, currentUser.id);
  }

  @Put('returns/:id/accept')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Прийняти повернення боргу (тільки власник боргу)' })
  @ApiParam({ name: 'id', description: 'ID повернення' })
  @ApiResponse({ status: 200, description: 'Повернення успішно прийняте', type: OweReturn })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Повернення не знайдене' })
  async acceptOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.acceptOweReturn(id, currentUser.id);
  }

  @Put('returns/:id/decline')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Відхилити повернення боргу (тільки власник боргу)' })
  @ApiParam({ name: 'id', description: 'ID повернення' })
  @ApiResponse({ status: 200, description: 'Повернення успішно відхилене', type: OweReturn })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  @ApiResponse({ status: 404, description: 'Повернення не знайдене' })
  async declineOweReturn(
    @Param('id') id: number,
    @CurrentUser() currentUser: User
  ): Promise<OweReturn> {
    return this.owesService.declineOweReturn(id, currentUser.id);
  }

  // ---------------------------------- Put -------------------------------------

  // ---------------------------------- Delete ----------------------------------
  
  @Delete('full/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Видалити повний борг' })
  @ApiParam({ name: 'id', description: 'ID боргу' })
  @ApiResponse({ status: 200, description: 'Борг успішно видалений' })
  @ApiResponse({ status: 404, description: 'Борг не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async deleteFullOwe(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteFullOwe(id);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Видалити пункт боргу' })
  @ApiParam({ name: 'id', description: 'ID пункту боргу' })
  @ApiResponse({ status: 200, description: 'Пункт успішно видалений' })
  @ApiResponse({ status: 404, description: 'Пункт не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async deleteOweItem(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweItem(id);
  }

  @Delete('participants/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Видалити учасника з боргу' })
  @ApiParam({ name: 'id', description: 'ID учасника' })
  @ApiResponse({ status: 200, description: 'Учасник успішно видалений' })
  @ApiResponse({ status: 404, description: 'Учасник не знайдений' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async deleteOweParticipant(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweParticipant(id);
  }

  @Delete('returns/:id')
  @UseGuards(JwtAuthGuard, OweOwnerGuard)
  @ApiOperation({ summary: 'Видалити повернення боргу' })
  @ApiParam({ name: 'id', description: 'ID повернення' })
  @ApiResponse({ status: 200, description: 'Повернення успішно видалене' })
  @ApiResponse({ status: 404, description: 'Повернення не знайдене' })
  @ApiResponse({ status: 403, description: 'Недостатньо прав' })
  async deleteOweReturn(@Param('id') id: number): Promise<void> {
    return this.owesService.deleteOweReturn(id);
  }

  // ---------------------------------- Delete ----------------------------------
}