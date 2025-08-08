// apps/api/src/config/environment.ts
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3001'),

  GOOGLE_CLOUD_PROJECT: z.string(),
  GOOGLE_CLOUD_REGION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),

  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number).default('5433'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_SSL: z.string().transform(val => val === 'true').default('false'),

  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z.string().transform(key => key.replace(/\\n/g, '\n')),

  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().default('https://api.deepseek.com/v1'),

  GCS_BUCKET_NAME: z.string(),
  STATIC_BUCKET_NAME: z.string(),

  EMAIL_FROM: z.string().default('noreply@miharina.mg'),
  EMAIL_REPLY_TO: z.string().default('support@miharina.mg'),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASSWORD: z.string().optional(),
  EMAIL_SERVICE_ACCOUNT: z.string(),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),

  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  EXCHANGE_RATE_API_KEY: z.string().optional(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  LOG_FILE_PATH: z.string().default('./logs'),

  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,

  googleCloud: {
    projectId: env.GOOGLE_CLOUD_PROJECT,
    region: env.GOOGLE_CLOUD_REGION,
    credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS,
    bucketName: env.GCS_BUCKET_NAME,
    staticBucketName: env.STATIC_BUCKET_NAME,
  },

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
  },

  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
  },

  deepseek: {
    apiKey: env.DEEPSEEK_API_KEY,
    baseUrl: env.DEEPSEEK_BASE_URL,
    maxTokens: 2000,
    temperature: 0.7,
  },

  storage: {
    bucketName: env.GCS_BUCKET_NAME,
    staticBucketName: env.STATIC_BUCKET_NAME,
    maxFileSize: env.MAX_FILE_SIZE,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
  },

  email: {
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    serviceAccount: env.EMAIL_SERVICE_ACCOUNT,
    smtpUser: env.EMAIL_SMTP_USER,
    smtpPassword: env.EMAIL_SMTP_PASSWORD,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  security: {
    jwtSecret: env.JWT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    corsOrigin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },

  apis: {
    googleTranslate: env.GOOGLE_TRANSLATE_API_KEY,
    exchangeRate: env.EXCHANGE_RATE_API_KEY,
  },

  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH,
  },

  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    uploadDir: env.UPLOAD_DIR,
  },

  madagascar: {
    regions: [
      'Antananarivo', 'Fianarantsoa', 'Toamasina',
      'Mahajanga', 'Toliara', 'Antsiranana'
    ],
    businessTypes: [
      'agricultural', 'artisan', 'digital_services', 'manufacturing',
      'retail', 'tourism', 'food_processing', 'textile'
    ],
    languages: ['fr', 'mg', 'en'],
    currencies: ['MGA', 'USD', 'EUR']
  },

  validation: {
    user: {
      phoneRegex: /^\+261[0-9]{9}$/,
      languages: ['fr', 'mg', 'en'],
      roles: ['entrepreneur', 'admin', 'partner'],
    },
    business: {
      nameMaxLength: 255,
      descriptionRequired: true,
      regions: ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'],
      businessTypes: ['agricultural', 'artisan', 'digital_services', 'manufacturing'],
      currencies: ['MGA', 'USD', 'EUR'],
    },
    opportunity: {
      titleMaxLength: 255,
      descriptionRequired: true,
      businessTypes: ['agricultural', 'artisan', 'digital_services', 'manufacturing'],
      statuses: ['active', 'expired', 'closed'],
      currencies: ['MGA', 'USD', 'EUR'],
    },
    match: {
      scoreMin: 0,
      scoreMax: 100,
      statuses: ['pending', 'accepted', 'rejected'],
    },
    message: {
      languages: ['fr', 'mg', 'en'],
      contentRequired: true,
    },
    successStory: {
      titleMaxLength: 255,
      contentRequired: true,
      statuses: ['draft', 'pending', 'published', 'archived'],
    },
  },
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isStaging = config.nodeEnv === 'staging';

export type Config = typeof config;