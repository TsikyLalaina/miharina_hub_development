import { Request, Response } from 'express';
import { firebaseManager } from '../config/firebase';
import { EmailService } from '../services/emailService';
import { dbManager } from '../config/database';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    phoneNumber?: string;
  };
}

export class AuthController {
  private emailService: EmailService | null = null;
  private emailServiceReady = false;

  constructor() {
    this.initializeEmailService();
  }

  private async initializeEmailService(): Promise<void> {
    try {
      this.emailService = EmailService.getInstance();

      // Test email service by attempting to initialize transporter
      // We'll create a simple validation method
      await this.validateEmailService();

      this.emailServiceReady = true;
      console.log('✅ EmailService initialized and validated successfully');
    } catch (error) {
      console.warn('⚠️ EmailService initialization failed, emails will be disabled:', error);
      this.emailService = null;
      this.emailServiceReady = false;
    }
  }

  private async validateEmailService(): Promise<void> {
    if (!this.emailService) {
      throw new Error('EmailService instance is null');
    }

    // Try to send a test email to validate the service
    // This will trigger the transporter initialization
    try {
      await this.emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test initialization',
        text: 'Test'
      });
    } catch (error) {
      // We expect this to fail with SMTP errors, but not with initialization errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If it's a transporter initialization error, re-throw
      if (errorMessage.includes('transporter not initialized') ||
        errorMessage.includes('SMTP configuration failed')) {
        throw error;
      }

      // Otherwise, it's probably just that we can't send to test@example.com, which is fine
      console.log('📧 Email service validation completed (expected SMTP error for test email)');
    }
  }

  private async ensureEmailServiceReady(): Promise<boolean> {
    if (!this.emailServiceReady) {
      await this.initializeEmailService();
    }
    return this.emailServiceReady && this.emailService !== null;
  }

  // Use arrow functions to automatically bind 'this'
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({ error: 'ID token is required' });
        return;
      }

      // Verify the Firebase ID token
      const decodedToken = await firebaseManager.verifyToken(idToken);
      const uid = decodedToken.uid;

      // Get user data from Firebase
      const userRecord = await firebaseManager.getUserById(uid);

      if (!userRecord) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if user exists in our database
      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT * FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [uid]);

        let userData;
        if (userResult.rows.length === 0) {
          // Create new user record
          const insertQuery = `
            INSERT INTO users (firebase_uid, email, phoneNumber, display_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *
          `;
          const displayName: string = userRecord.displayName ||
            (userRecord.email ? userRecord.email.split('@')[0] : 'User') || 'User';

          const insertResult = await client.query(insertQuery, [
            uid,
            userRecord.email,
            userRecord.phoneNumber,
            displayName
          ]);

          userData = insertResult.rows[0];

          // Send welcome email (optional for login - don't fail if it doesn't work)
          if (userRecord.email && await this.ensureEmailServiceReady()) {
            try {
              await this.emailService!.sendWelcomeEmail(
                userRecord.email,
                displayName as string,
                'fr' // Default to French
              );
              console.log('✅ Welcome email sent successfully');
            } catch (error) {
              console.error('❌ Failed to send welcome email (non-critical for login):', error);
              // Don't fail login if email fails
            }
          }
        } else {
          userData = userResult.rows[0];

          // Update last login
          await client.query(
            'UPDATE users SET last_login_at = NOW() WHERE firebase_uid = $1',
            [uid]
          );
        }

        res.json({
          success: true,
          user: {
            id: userData.user_id,
            firebaseUid: userData.firebase_uid,
            email: userData.email,
            phone: userData.phoneNumber,
            displayName: userData.displayName,
            createdAt: userData.createdAt,
            lastLoginAt: userData.lastLoginAt
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(401).json({ error: 'Invalid token', details: error.message });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    let firebaseUserCreated = false;
    let userRecord: any = null;
    let dbUserCreated = false;
    let userData: any = null;

    try {
      const { email, password, phoneNumber, displayName, firstName, lastName } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Handle displayName - accept either displayName or firstName+lastName
      let finalDisplayName: string;
      if (displayName) {
        finalDisplayName = displayName.trim();
      } else if (firstName || lastName) {
        finalDisplayName = `${firstName || ''} ${lastName || ''}`.trim();
      } else {
        // Fallback to email username
        finalDisplayName = email.split('@')[0];
      }

      // Validate displayName is not empty
      if (!finalDisplayName || finalDisplayName.length === 0) {
        res.status(400).json({
          error: 'Display name is required',
          details: 'Please provide either displayName or firstName/lastName'
        });
        return;
      }

      // Check if email service is available BEFORE creating the user
      const emailServiceReady = await this.ensureEmailServiceReady();
      if (!emailServiceReady) {
        res.status(503).json({
          error: 'Registration temporarily unavailable',
          details: 'Email service is not configured. Please contact support.'
        });
        return;
      }

      // Create user in Firebase
      userRecord = await firebaseManager.createUser({
        email,
        password,
        phoneNumber: phoneNumber,
        displayName: finalDisplayName
      });
      firebaseUserCreated = true;
      console.log('👤 Created Firebase user:', userRecord.uid);

      // Create user record in database
      const client = await dbManager.getClient();
      try {
        // Detect preferred language from middleware (Accept-Language / X-User-Language)
        const userLanguage = (req as any).userLanguage || 'fr';

        const insertQuery = `
          INSERT INTO users (firebase_uid, email, phone_number, display_name, preferred_language, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          userRecord.uid,
          email,
          phoneNumber,
          finalDisplayName,
          userLanguage
        ]);

        userData = result.rows[0];
        dbUserCreated = true;
        console.log('💾 Created database user record');

        // Send welcome email - required for registration completion
        try {
          // Use same detected language for welcome email
          await this.emailService!.sendWelcomeEmail(
            email,
            finalDisplayName,
            userLanguage
          );
          console.log('✅ Welcome email sent successfully');
        } catch (emailError) {
          console.error('❌ Failed to send welcome email:', emailError);
          throw new Error('Registration failed: Unable to send welcome email. Please try again later.');
        }

        res.status(201).json({
          success: true,
          user: {
            id: userData.user_id,
            firebaseUid: userData.firebase_uid,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            displayName: userData.displayName,
            createdAt: userData.createdAt
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);

      // Clean up in reverse order of creation
      if (dbUserCreated && userRecord) {
        try {
          const client = await dbManager.getClient();
          try {
            await client.query('DELETE FROM users WHERE firebase_uid = $1', [userRecord.uid]);
            console.log('🧹 Cleaned up database record for:', userRecord.uid);
          } finally {
            client.release();
          }
        } catch (dbCleanupError) {
          console.error('❌ Failed to cleanup database record:', dbCleanupError);
        }
      }

      if (firebaseUserCreated && userRecord) {
        try {
          await firebaseManager.deleteUser(userRecord.uid);
          console.log('🧹 Cleaned up Firebase user:', userRecord.uid);
        } catch (cleanupError) {
          // Ignore "user not found" errors during cleanup
          if (cleanupError instanceof Error && !cleanupError.message?.includes('user-not-found')) {
            console.error('❌ Failed to cleanup Firebase user:', cleanupError);
          }
        }
      }

      // Handle specific error types
      if (error.code === 'auth/email-already-exists') {
        res.status(409).json({ error: 'Email already exists' });
      } else if (error.code === 'auth/weak-password') {
        res.status(400).json({ error: 'Password is too weak' });
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // PostgreSQL duplicate key error
        res.status(409).json({
          error: 'Email already exists',
          details: 'An account with this email address already exists.'
        });
      } else if (error.message && error.message.includes('email')) {
        res.status(500).json({
          error: 'Registration failed',
          details: 'Unable to send welcome email. Please try again later.'
        });
      } else {
        res.status(500).json({ error: 'Registration failed', details: error.message });
      }
    }
  };

  public logout = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Firebase handles token invalidation on the client side
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      res.status(500).json({ error: 'Logout failed', details: error.message });
    }
  };

  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      // This would typically involve Firebase Admin SDK token refresh
      // For now, we'll return a success response
      res.json({ success: true, message: 'Token refreshed' });
    } catch (error: any) {
      console.error('❌ Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed', details: error.message });
    }
  };

  public getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const query = `
          SELECT 
            user_id,
            firebase_uid,
            email,
            phone_number,
            display_name,
            preferred_language,
            created_at,
            updated_at,
            last_login_at
          FROM users 
          WHERE firebase_uid = $1
        `;

        const result = await client.query(query, [uid]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const user = result.rows[0];
        res.json({
          success: true,
          user: {
            id: user.user_id,
            firebaseUid: user.firebase_uid,
            email: user.email,
            phoneNumber: user.phone_number,
            displayName: user.display_name,
            preferredLanguage: user.preferred_language,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastLoginAt: user.last_login_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile', details: error.message });
    }
  };

  public updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Accept multiple naming conventions from clients (email updates are not allowed)
      const {
        displayName,
        phone,
        phoneNumber,
        preferredLanguage,
        preferred_language
      } = req.body as any;

      const finalPhone: string | undefined = phone ?? phoneNumber;
      const finalPreferredLanguage: 'fr' | 'mg' | 'en' | undefined = (preferredLanguage ?? preferred_language) as any;

      // Validate preferred language if provided
      if (finalPreferredLanguage && !['fr', 'mg', 'en'].includes(finalPreferredLanguage)) {
        res.status(400).json({
          error: 'Invalid preferred language. Must be fr, mg, or en',
          error_fr: 'Langue préférée invalide. Doit être fr, mg ou en',
          error_mg: 'Teny tianina tsy mety. Tokony ho fr, mg, na en'
        });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const updateQuery = `
          UPDATE users 
          SET display_name = COALESCE($1, display_name),
              phone_number = COALESCE($2, phone_number),
              preferred_language = COALESCE($3, preferred_language),
              updated_at = NOW()
          WHERE firebase_uid = $4
          RETURNING *
        `;

        const result = await client.query(updateQuery, [displayName, finalPhone, finalPreferredLanguage, uid]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const user = result.rows[0];

        // Update Firebase user (include only defined fields to satisfy exactOptionalPropertyTypes)
        const firebaseUpdate: { displayName?: string; phoneNumber?: string } = {};
        if (typeof displayName === 'string' && displayName.trim().length > 0) {
          firebaseUpdate.displayName = displayName.trim();
        }
        if (typeof finalPhone === 'string' && finalPhone.trim().length > 0) {
          firebaseUpdate.phoneNumber = finalPhone.trim();
        }
        if (Object.keys(firebaseUpdate).length > 0) {
          await firebaseManager.updateUser(uid, firebaseUpdate);
        }

        res.json({
          success: true,
          user: {
            id: user.user_id,
            firebaseUid: user.firebase_uid,
            email: user.email,
            phoneNumber: user.phone_number,
            displayName: user.display_name,
            preferredLanguage: user.preferred_language,
            updatedAt: user.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
  };
}