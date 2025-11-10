import {
  Controller,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators';
import { UsersService } from 'src/users/users.service';
import { GroupsService } from 'src/groups/groups.service';
import { OwesService } from 'src/owes/owes.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
    private readonly groupsService: GroupsService,
    private readonly owesService: OwesService,
  ) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ): Promise<{ avatarUrl: string }> {
    console.log('Upload avatar - user:', user);
    console.log('Upload avatar - file:', file ? 'exists' : 'missing');
    console.log('Upload avatar - mimetype:', file?.mimetype);
    console.log('Upload avatar - size:', file?.size);
    
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = user.id || user.userId;
    const currentUser = await this.usersService.getUserById(userId);

    if (currentUser.avatarUrl) {
      await this.uploadService.deleteImage(currentUser.avatarUrl);
    }

    const avatarUrl = await this.uploadService.uploadImage(file);

    await this.usersService.updateUser(userId, { avatarUrl });

    return { avatarUrl };
  }

  @Post('group-avatar/:groupId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Param('groupId') groupId: string,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = user.id || user.userId;
    const group = await this.groupsService.getGroupById(parseInt(groupId));

    if (group.avatarUrl) {
      await this.uploadService.deleteImage(group.avatarUrl);
    }

    const avatarUrl = await this.uploadService.uploadImage(file);

    await this.groupsService.updateGroup(userId, parseInt(groupId), { avatarUrl });

    return { avatarUrl };
  }

  @Post('owe-image/:oweItemId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadOweImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Param('oweItemId') oweItemId: string,
  ): Promise<{ imageUrl: string; imageUrls: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = user.id || user.userId;
    const oweItem = await this.owesService.getOweItemById(parseInt(oweItemId));

    // Перевіряємо чи користувач має доступ до цього боргу
    const hasAccess = await this.owesService.userHasAccessToOweItem(userId, parseInt(oweItemId));
    if (!hasAccess) {
      throw new BadRequestException('You do not have access to this owe item');
    }

    // Перевіряємо ліміт 3 фото
    const currentImages = oweItem.imageUrls || [];
    if (currentImages.length >= 3) {
      throw new BadRequestException('Maximum 3 images allowed per owe item');
    }

    const imageUrl = await this.uploadService.uploadImage(file);
    const updatedImages = [...currentImages, imageUrl];

    await this.owesService.updateOweItemImages(parseInt(oweItemId), updatedImages);

    return { imageUrl, imageUrls: updatedImages };
  }

  @Delete('owe-image/:oweItemId')
  @UseGuards(JwtAuthGuard)
  async deleteOweImage(
    @CurrentUser() user: any,
    @Param('oweItemId') oweItemId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<{ imageUrls: string[] }> {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    const userId = user.id || user.userId;
    const oweItem = await this.owesService.getOweItemById(parseInt(oweItemId));

    // Перевіряємо чи користувач має доступ до цього боргу
    const hasAccess = await this.owesService.userHasAccessToOweItem(userId, parseInt(oweItemId));
    if (!hasAccess) {
      throw new BadRequestException('You do not have access to this owe item');
    }

    const currentImages = oweItem.imageUrls || [];
    const updatedImages = currentImages.filter(url => url !== imageUrl);

    await this.uploadService.deleteImage(imageUrl);
    await this.owesService.updateOweItemImages(parseInt(oweItemId), updatedImages);

    return { imageUrls: updatedImages };
  }
}
