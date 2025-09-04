// apps/api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import { initializeFirebase } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import routes from './routes';

class MiharinaServer {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy (needed when behind load balancers / Cloud Run)
    this.app.set('trust proxy', 1);
    // Security middleware with Madagascar-specific considerations
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // Allow connections to Madagascar government domains if needed
          connectSrc: ["'self'", "https://edbm.mg", "https://*.gov.mg"]
        }
      }
    }));

    // CORS configuration for Madagascar and development
    this.app.use(cors({
      origin: [
        'http://localhost:3000',
        'https://miharina-hub-development.web.app',
        'https://www.miharinamg.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        // Add language header for multilingual support
        'Accept-Language',
        'X-User-Language'
      ]
    }));

    // Global Rate limiting - consider Madagascar's internet infrastructure
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: config.nodeEnv === 'development' ? 100 : 200, // Dev lower for easier testing
      standardHeaders: true, // send RateLimit-* headers
      legacyHeaders: false,  // disable X-RateLimit-* headers
      message: {
        error: 'Too many requests, please try again later',
        error_fr: 'Trop de requêtes, veuillez réessayer plus tard',
        error_mg: 'Fangatahana be loatra, andramo indray rehefa afaka kelikeliny'
      },
      keyGenerator: (req: express.Request, _res: express.Response): string => {
        const auth = req.headers['authorization'];
        if (typeof auth === 'string' && auth.trim().length > 0) {
          return auth;
        }
        // Always return a string: fall back to a constant if IP is missing
        return req.ip || 'unknown-ip';
      },
      // Skip rate limiting for health checks and CORS preflights
      skip: (req) => req.path === '/health' || req.method === 'OPTIONS'
    });
    this.app.use(limiter);

    // Body parsing with larger limits for file uploads
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(requestLogger);

    // Language detection middleware
    this.app.use((req, _res, next) => {
      const acceptedLanguage = req.headers['accept-language'] ||
        req.headers['x-user-language'] ||
        'fr'; // Default to French for Madagascar

      req.userLanguage = acceptedLanguage.includes('mg') ? 'mg' :
        acceptedLanguage.includes('en') ? 'en' : 'fr';
      next();
    });

    // Health check endpoint with Madagascar timezone
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private initializeRoutes(): void {
    // API routes - using consolidated routes file
    this.app.use('/api', routes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Miharina Hub API - Madagascar Business Platform',
        version: '1.0.0',
        environment: config.nodeEnv,
        endpoints: {
          auth: '/api/auth',
          businessProfiles: '/api/business-profiles',
          opportunities: '/api/opportunities',
          upload: '/api/upload',
          matches: '/api/matches',
          messages: '/api/messages',
          successStories: '/api/success-stories'
        }
      });
    });

    // 404 handler with multilingual support
    this.app.use('*', (_req, res) => {
      const language = _req.userLanguage || 'fr';
      const messages = {
        fr: 'Route non trouvée',
        mg: 'Tsy hita ny lalana',
        en: 'Route not found'
      };

      res.status(404).json({
        error: messages[language],
        error_fr: messages.fr,
        error_mg: messages.mg,
        error_en: messages.en,
        requested_path: _req.originalUrl
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize Firebase Admin SDK
      await initializeFirebase();
      console.log('✅ Firebase initialized successfully');

      // Connect to PostgreSQL database
      await connectDatabase();
      console.log('✅ PostgreSQL database connected successfully');

      // Start server
      this.app.listen(this.port, () => {
        console.log(`🚀 Miharina API server running on port ${this.port}`);
        console.log(`📍 Environment: ${config.nodeEnv}`);
        console.log(`🇲🇬 Region: Madagascar`);
        console.log(`🌍 Health check: http://localhost:${this.port}/health`);

        if (config.nodeEnv === 'development') {
          console.log(`📖 API Documentation: http://localhost:${this.port}/api/v1/docs`);
          console.log(`🗺️  Regions endpoint: http://localhost:${this.port}/api/v1/regions`);
          console.log(`🏢 Business types: http://localhost:${this.port}/api/v1/business-types`);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      userLanguage?: 'fr' | 'mg' | 'en';
    }
  }
}

// Start server
const server = new MiharinaServer();
server.start();