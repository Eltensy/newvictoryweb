// server/fileStorage.ts - новый файл для работы с облачным хранилищем

import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
}

export class CloudFileStorage {
  async uploadFile(
    buffer: Buffer, 
    filename: string, 
    resourceType: 'image' | 'video'
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'gaming-submissions', // Папка в Cloudinary
          public_id: filename.replace(/\.[^/.]+$/, ''), // Убираем расширение
          overwrite: false,
          quality: resourceType === 'image' ? 'auto' : undefined,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result as CloudinaryUploadResult);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log('File deleted from Cloudinary:', publicId);
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
    }
  }

  // Генерация URL для трансформации изображений
  generateUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }): string {
    return cloudinary.url(publicId, {
      ...options,
      secure: true,
    });
  }

  // Генерация thumbnail
  generateThumbnail(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      format: 'webp',
      secure: true,
    });
  }
}

export const cloudStorage = new CloudFileStorage();