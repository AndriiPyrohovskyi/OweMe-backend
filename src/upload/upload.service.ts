import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
      api_key: process.env.CLOUDINARY_API_KEY || 'demo',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'oweme_avatars',
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestException('Failed to upload image'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      const readable = Readable.from(file.buffer);
      readable.pipe(uploadStream);
    });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;

    try {
      const publicId = this.extractPublicId(imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
    }
  }

  private extractPublicId(url: string): string | null {
    const regex = /oweme_avatars\/([^/.]+)/;
    const match = url.match(regex);
    return match ? `oweme_avatars/${match[1]}` : null;
  }
}
