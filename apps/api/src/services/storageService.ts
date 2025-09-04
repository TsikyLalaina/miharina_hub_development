import { Storage } from '@google-cloud/storage';
import { config } from '../config/environment';
import { v4 as uuidv4 } from 'uuid';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface UploadOptions {
  file: MulterFile;
  folder: string;
  filename?: string;
  metadata?: any;
}

interface SignedUrlOptions {
  filename: string;
  folder: string;
  contentType: string;
  expiresIn?: number;
}

export class StorageService {
  private storage: Storage;
  private bucketName: string;
  private static instance: StorageService;

  constructor() {
    this.storage = new Storage({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.credentialsPath,
    });
    this.bucketName = config.googleCloud.bucketName;
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public async uploadFile(options: UploadOptions): Promise<string> {
    try {
      const { file, folder, filename, metadata } = options;
      
      const uniqueFilename = filename || `${uuidv4()}-${file.originalname}`;
      const filePath = `${folder}/${uniqueFilename}`;
      
      const bucket = this.storage.bucket(this.bucketName);
      const blob = bucket.file(filePath);
      
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          ...metadata,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
          console.error(' Upload error:', error);
          reject(error);
        });

        blobStream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
          console.log(` File uploaded: ${publicUrl}`);
          resolve(publicUrl);
        });

        blobStream.end(file.buffer);
      });
    } catch (error: any) {
      console.error(' Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      // Normalize input to an object path within the bucket
      let objectPath = filePath;

      // Handle public URL like: https://storage.googleapis.com/<bucket>/<object>
      if (objectPath.startsWith('http')) {
        try {
          const url = new URL(objectPath);
          // Remove leading '/'
          const pathname = url.pathname.replace(/^\//, '');
          const parts = pathname.split('/');
          // If the first segment is the bucket name, strip it
          if (parts.length > 1 && parts[0] === this.bucketName) {
            objectPath = parts.slice(1).join('/');
          } else {
            // Some CDNs or custom domains might already be bucket-relative
            objectPath = pathname;
          }
        } catch {
          // Fallback: keep original string
        }
      }

      // Handle gs://<bucket>/<object>
      if (objectPath.startsWith('gs://')) {
        const withoutScheme = objectPath.replace('gs://', '');
        const slashIdx = withoutScheme.indexOf('/');
        if (slashIdx !== -1) {
          // const bucketFromUri = withoutScheme.slice(0, slashIdx);
          objectPath = withoutScheme.slice(slashIdx + 1);
        }
      }

      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(objectPath).delete();
      console.log(` File deleted: ${objectPath}`);
    } catch (error: any) {
      console.error(' Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  public async getSignedUploadUrl(options: SignedUrlOptions): Promise<string> {
    try {
      const { filename, folder, contentType, expiresIn = 15 * 60 * 1000 } = options;
      const filePath = `${folder}/${filename}`;
      
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresIn,
        contentType,
      });

      return url;
    } catch (error: any) {
      console.error(' Signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  public async getSignedReadUrl(filePath: string, expiresIn: number = 60 * 60 * 1000): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn,
      });

      return url;
    } catch (error: any) {
      console.error(' Signed read URL error:', error);
      throw new Error(`Failed to generate signed read URL: ${error.message}`);
    }
  }

  public async listFiles(prefix?: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const options = prefix ? { prefix } : {};
      const [files] = await bucket.getFiles(options);
      
      return files.map((file: any) => file.name);
    } catch (error: any) {
      console.error(' List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.file(filePath).exists();
      return exists;
    } catch (error: any) {
      console.error(' File exists check error:', error);
      return false;
    }
  }

  public getStoragePath(type: 'user' | 'business' | 'opportunity', id: string, filename: string): string {
    const paths = {
      user: `users/${id}/`,
      business: `businesses/${id}/`,
      opportunity: `opportunities/${id}/`,
    };
    return `${paths[type]}${filename}`;
  }
}
