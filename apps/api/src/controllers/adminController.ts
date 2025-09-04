// apps/api/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { dbManager } from '../config/database';
import { updateCustomClaims, firebaseManager } from '../config/firebase';
import { config } from '../config/environment';
import { EmailService } from '../services/emailService';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
  userLanguage?: 'fr' | 'mg' | 'en';
}

export class AdminController {
  // Development-only: promote current user to admin
  public bootstrapAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (config.nodeEnv !== 'development') {
        res.status(403).json({ error: 'Bootstrap allowed only in development' });
        return;
      }
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      await updateCustomClaims(uid, { role: 'admin' });
      // Also update DB role for visibility
      const client = await dbManager.getClient();
      try {
        await client.query('UPDATE users SET role = $1, updated_at = NOW() WHERE firebase_uid = $2', ['admin', uid]);
      } finally {
        client.release();
      }
      res.json({ success: true, message: 'User promoted to admin (development only)', uid });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to bootstrap admin', details: error.message });
    }
  };

  // Create a Firebase user with a specified role and insert into DB
  public createUserWithRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const adminUid = req.user?.uid;
      if (!adminUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { email, password, displayName, phoneNumber, role } = req.body as any;
      if (!email || !password || !role) {
        res.status(400).json({ error: 'email, password and role are required' });
        return;
      }
      if (!['entrepreneur', 'admin', 'partner'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be entrepreneur, admin, or partner' });
        return;
      }

      // Create Firebase user
      const userRecord = await firebaseManager.createUser({ email, password, displayName, phoneNumber });
      await updateCustomClaims(userRecord.uid, { role });

      // Get admin DB user id to fill created_by
      const client = await dbManager.getClient();
      try {
        const adminRow = await client.query('SELECT user_id FROM users WHERE firebase_uid = $1', [adminUid]);
        const createdBy = adminRow.rows[0]?.user_id || null;
        const preferredLanguage = req.userLanguage || 'fr';

        const insert = `
          INSERT INTO users (firebase_uid, email, phone_number, display_name, preferred_language, created_by, role, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (firebase_uid) DO UPDATE SET
            email = EXCLUDED.email,
            phone_number = COALESCE(EXCLUDED.phone_number, users.phone_number),
            display_name = COALESCE(EXCLUDED.display_name, users.display_name),
            preferred_language = COALESCE(EXCLUDED.preferred_language, users.preferred_language),
            role = COALESCE(EXCLUDED.role, users.role),
            updated_at = NOW()
          RETURNING *
        `;
        const result = await client.query(insert, [
          userRecord.uid,
          email,
          phoneNumber || null,
          displayName || (email.split('@')[0]),
          preferredLanguage,
          createdBy,
          role
        ]);

        // Best-effort: send welcome email in user's preferred language
        try {
          const name = (displayName || email.split('@')[0]);
          await EmailService.getInstance().sendWelcomeEmail(email, name, preferredLanguage);
        } catch (e) {
          console.warn('⚠️ Failed to send welcome email for admin-created user:', (e as Error).message);
        }

        res.status(201).json({
          success: true,
          user: {
            id: result.rows[0].user_id,
            firebaseUid: result.rows[0].firebase_uid,
            email: result.rows[0].email,
            phoneNumber: result.rows[0].phone_number,
            displayName: result.rows[0].display_name,
            preferredLanguage: result.rows[0].preferred_language,
            role
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create user with role', details: error.message });
    }
  };

  // Update an existing user's role
  public setUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { uid } = req.params as any;
      const { role } = req.body as any;
      if (!uid || !role) {
        res.status(400).json({ error: 'uid and role are required' });
        return;
      }
      if (!['entrepreneur', 'admin', 'partner'].includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be entrepreneur, admin, or partner' });
        return;
      }
      await updateCustomClaims(uid, { role });
      // Update DB role for visibility
      const client = await dbManager.getClient();
      try {
        await client.query('UPDATE users SET role = $1, updated_at = NOW() WHERE firebase_uid = $2', [role, uid]);
      } finally {
        client.release();
      }
      res.json({ success: true, uid, role });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to set user role', details: error.message });
    }
  };

  // Role-protected resources for testing
  public adminOnly = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, resource: 'admin-only' });
  };
  public partnerOnly = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, resource: 'partner-only' });
  };
  public entrepreneurOnly = async (_req: AuthRequest, res: Response): Promise<void> => {
    res.json({ success: true, resource: 'entrepreneur-only' });
  };
}
