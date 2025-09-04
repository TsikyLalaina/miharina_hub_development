import { Request, Response } from 'express';
// Multer configuration is centralized in middleware/upload
import { StorageService } from '../services/storageService';
import { dbManager } from '../config/database';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
  file?: Express.Multer.File;
}

// Multer storage, file size limits and mime type filtering are enforced by
// the centralized upload middleware defined in ../middleware/upload.

export class UploadController {
  private storageService: StorageService;

  constructor() {
    this.storageService = StorageService.getInstance();
  }

  // Upload middleware is applied at the route level (see routes/index.ts)

  public async uploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { type, businessId, opportunityId } = req.body;
      const allowedTypes = ['profile', 'business', 'opportunity', 'document'];
      if (!allowedTypes.includes(type)) {
        res.status(400).json({ error: 'Invalid upload type' });
        return;
      }

      const fileName = `${type}/${userUid}/${Date.now()}-${req.file.originalname}`;
      const fileUrl = await this.storageService.uploadFile({
        file: req.file,
        folder: 'uploads',
        filename: fileName,
      });

      // Store file reference in database
      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const insertQuery = `
          INSERT INTO uploads (user_id, file_url, file_type, file_name, uploaded_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING id
        `;

        const result = await client.query(insertQuery, [
          userId,
          fileUrl,
          type,
          req.file.originalname
        ]);

        // Update business profile pointer to the uploaded file if businessId provided
        if (businessId && type === 'business') {
          const updateQuery = 'UPDATE business_profiles SET logo_upload_id = $1 WHERE business_id = $2';
          await client.query(updateQuery, [result.rows[0].id, businessId]);
        }

        // Link upload to an opportunity via join table if provided
        if (opportunityId && type === 'opportunity') {
          const role = (req.body.role === 'hero' ? 'hero' : 'attachment');
          const linkQuery = `
            INSERT INTO opportunity_uploads (opportunity_id, upload_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (opportunity_id, upload_id) DO NOTHING
          `;
          await client.query(linkQuery, [opportunityId, result.rows[0].id, role]);
        }

        // Set user's current avatar to this upload when type is profile
        if (type === 'profile') {
          const setAvatarQuery = 'UPDATE users SET avatar_upload_id = $1 WHERE user_id = $2';
          await client.query(setAvatarQuery, [result.rows[0].id, userId]);
        }

        res.json({
          success: true,
          file: {
            id: result.rows[0].id,
            url: fileUrl,
            type,
            name: req.file.originalname,
            uploadedAt: new Date()
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
  }

  public async getUploads(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const query = `
          SELECT id, file_url, file_type, file_name, uploaded_at
          FROM uploads
          WHERE user_id = $1
          ORDER BY uploaded_at DESC
        `;

        const result = await client.query(query, [userId]);

        res.json({
          success: true,
          uploads: result.rows.map(row => ({
            id: row.id,
            url: row.file_url,
            type: row.file_type,
            name: row.file_name,
            uploadedAt: row.uploaded_at
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get uploads error:', error);
      res.status(500).json({ error: 'Failed to get uploads', details: error.message });
    }
  }

  public async deleteUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const query = `
          DELETE FROM uploads 
          WHERE id = $1 AND user_id = $2
          RETURNING file_url
        `;

        const result = await client.query(query, [id, userId]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Upload not found' });
          return;
        }

        // Delete from storage
        await this.storageService.deleteFile(result.rows[0].file_url);

        res.json({ success: true, message: 'Upload deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Delete upload error:', error);
      res.status(500).json({ error: 'Failed to delete upload', details: error.message });
    }
  }
}
