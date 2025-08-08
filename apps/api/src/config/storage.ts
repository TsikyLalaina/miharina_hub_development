// apps/api/src/config/storage.ts
import { Storage } from '@google-cloud/storage';
import { config } from './environment';

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: config.googleCloud.projectId,
  keyFilename: config.googleCloud.credentialsPath,
});

// Storage buckets configuration using environment variables
export const storageConfig = {
  // Static content bucket (for public assets)
  staticBucket: config.googleCloud.staticBucketName,

  // Upload bucket (for user-generated content)
  uploadsBucket: config.googleCloud.bucketName,

  // Temporary bucket (for processing)
  tempBucket: `${config.googleCloud.bucketName}-temp`,
};

// Get bucket instances
export const staticBucket = storage.bucket(storageConfig.staticBucket);
export const uploadsBucket = storage.bucket(storageConfig.uploadsBucket);
export const tempBucket = storage.bucket(storageConfig.tempBucket);

// Storage service export
export { storage };

// File path helpers for organized storage
export const storagePaths = {
  // User-related files
  user: {
    avatar: (userId: string, filename: string) => `users/${userId}/avatars/${filename}`,
    documents: (userId: string, filename: string) => `users/${userId}/documents/${filename}`,
  },

  // Business-related files
  business: {
    logo: (businessId: string, filename: string) => `businesses/${businessId}/logos/${filename}`,
    documents: (businessId: string, filename: string) => `businesses/${businessId}/documents/${filename}`,
    gallery: (businessId: string, filename: string) => `businesses/${businessId}/gallery/${filename}`,
  },

  // Opportunity-related files
  opportunity: {
    images: (opportunityId: string, filename: string) => `opportunities/${opportunityId}/images/${filename}`,
    documents: (opportunityId: string, filename: string) => `opportunities/${opportunityId}/documents/${filename}`,
  },

  // Temporary files
  temp: (filename: string) => `temp/${filename}`,
};

// Storage URLs configuration
export const getStorageUrl = (bucketName: string, filePath: string): string => {
  return `https://storage.googleapis.com/${bucketName}/${filePath}`;
};

// Signed URL configuration for secure uploads
export const signedUrlConfig = {
  version: 'v4' as const,
  action: 'write' as const,
  expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  contentType: 'application/octet-stream',
};

// File upload configuration
export const uploadConfig = {
  maxFileSize: config.storage.maxFileSize,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
};

// Helper function to validate file types
export const isValidFileType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimeType);
};

// Helper function to generate unique filename
export const generateUniqueFilename = (originalName: string, prefix: string = ''): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${prefix}${timestamp}-${randomString}.${extension}`;
};
