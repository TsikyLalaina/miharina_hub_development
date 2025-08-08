import { Request, Response } from 'express';
import { dbManager } from '../config/database';

import { NotificationService } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}



export class SuccessStoriesController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public async createSuccessStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const {
        title,
        description,
        businessName,
        businessType,
        sectors,
        countries,
        impactMetrics,
        images
      } = req.body;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!title || !description) {
        res.status(400).json({ error: 'Title and description are required' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].id;

        const insertQuery = `
          INSERT INTO success_stories (
            user_id, title, description, business_name, business_type, 
            sectors, countries, impact_metrics, images, is_featured, 
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, 'published', NOW(), NOW())
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          userId,
          title,
          description,
          businessName || '',
          businessType || '',
          JSON.stringify(sectors || []),
          JSON.stringify(countries || []),
          JSON.stringify(impactMetrics || {}),
          JSON.stringify(images || [])
        ]);

        const story = result.rows[0];

        await this.notificationService.createSuccessStoryNotification(userId, story.id);

        res.status(201).json({
          success: true,
          story: {
            id: story.id,
            title: story.title,
            description: story.description,
            businessName: story.business_name,
            businessType: story.business_type,
            sectors: story.sectors,
            countries: story.countries,
            impactMetrics: story.impact_metrics,
            images: story.images,
            isFeatured: story.is_featured,
            status: story.status,
            createdAt: story.created_at,
            updatedAt: story.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Create success story error:', error);
      res.status(500).json({ error: 'Failed to create success story', details: error.message });
    }
  }

  public async getSuccessStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, featured, userId, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const client = await dbManager.getClient();
      try {
        let query = `
          SELECT 
            ss.*,
            u.firebase_uid,
            bp.business_name,
            bp.logo_url,
            bp.region
          FROM success_stories ss
          JOIN users u ON ss.user_id = u.id
          JOIN business_profiles bp ON ss.user_id = bp.user_id
          WHERE ss.status = 'published'
        `;

        const params: any[] = [Number(limit), offset];
        let paramCount = 2;

        if (featured === 'true') {
          paramCount++;
          query += ` AND ss.is_featured = $${paramCount}`;
          params.push(true);
        }

        if (userId) {
          paramCount++;
          query += ` AND ss.user_id = $${paramCount}`;
          params.push(userId);
        }

        if (search) {
          paramCount++;
          query += ` AND (ss.title ILIKE $${paramCount} OR ss.description ILIKE $${paramCount})`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY ss.created_at DESC LIMIT $1 OFFSET $2`;

        const result = await client.query(query, params);

        res.json({
          success: true,
          stories: result.rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            businessName: row.business_name,
            businessType: row.business_type,
            sectors: row.sectors,
            countries: row.countries,
            impactMetrics: row.impact_metrics,
            images: row.images,
            isFeatured: row.is_featured,
            status: row.status,
            firebaseUid: row.firebase_uid,
            logoUrl: row.logo_url,
            region: row.region,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get success stories error:', error);
      res.status(500).json({ error: 'Failed to get success stories', details: error.message });
    }
  }

  public async getSuccessStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Story ID is required' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const query = `
          SELECT 
            ss.*,
            u.firebase_uid,
            bp.business_name,
            bp.logo_url,
            bp.region,
            bp.business_type
          FROM success_stories ss
          JOIN users u ON ss.user_id = u.id
          JOIN business_profiles bp ON ss.user_id = bp.user_id
          WHERE ss.id = $1 AND ss.status = 'published'
        `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        const story = result.rows[0];

        res.json({
          success: true,
          story: {
            id: story.id,
            title: story.title,
            description: story.description,
            businessName: story.business_name,
            businessType: story.business_type,
            sectors: story.sectors,
            countries: story.countries,
            impactMetrics: story.impact_metrics,
            images: story.images,
            isFeatured: story.is_featured,
            status: story.status,
            firebaseUid: story.firebase_uid,
            logoUrl: story.logo_url,
            region: story.region,
            createdAt: story.created_at,
            updatedAt: story.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get success story error:', error);
      res.status(500).json({ error: 'Failed to get success story', details: error.message });
    }
  }

  public async updateSuccessStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;
      const updates = req.body;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!id) {
        res.status(400).json({ error: 'Story ID is required' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].id;

        const checkQuery = 'SELECT user_id FROM success_stories WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        if (checkResult.rows[0].user_id !== userId) {
          res.status(403).json({ error: 'Unauthorized to update this story' });
          return;
        }

        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.title) {
          paramCount++;
          fields.push(`title = $${paramCount}`);
          values.push(updates.title);
        }

        if (updates.description) {
          paramCount++;
          fields.push(`description = $${paramCount}`);
          values.push(updates.description);
        }

        if (updates.businessName) {
          paramCount++;
          fields.push(`business_name = $${paramCount}`);
          values.push(updates.businessName);
        }

        if (updates.businessType) {
          paramCount++;
          fields.push(`business_type = $${paramCount}`);
          values.push(updates.businessType);
        }

        if (updates.sectors) {
          paramCount++;
          fields.push(`sectors = $${paramCount}`);
          values.push(JSON.stringify(updates.sectors));
        }

        if (updates.countries) {
          paramCount++;
          fields.push(`countries = $${paramCount}`);
          values.push(JSON.stringify(updates.countries));
        }

        if (updates.impactMetrics) {
          paramCount++;
          fields.push(`impact_metrics = $${paramCount}`);
          values.push(JSON.stringify(updates.impactMetrics));
        }

        if (updates.images) {
          paramCount++;
          fields.push(`images = $${paramCount}`);
          values.push(JSON.stringify(updates.images));
        }

        if (fields.length === 0) {
          res.status(400).json({ error: 'No valid fields to update' });
          return;
        }

        paramCount++;
        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date());

        const updateQuery = `
          UPDATE success_stories 
          SET ${fields.join(', ')}
          WHERE id = $1 AND user_id = $2
          RETURNING *
        `;

        values.unshift(id, userId);

        const result = await client.query(updateQuery, values);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        const story = result.rows[0];

        res.json({
          success: true,
          story: {
            id: story.id,
            title: story.title,
            description: story.description,
            businessName: story.business_name,
            businessType: story.business_type,
            sectors: story.sectors,
            countries: story.countries,
            impactMetrics: story.impact_metrics,
            images: story.images,
            isFeatured: story.is_featured,
            status: story.status,
            createdAt: story.created_at,
            updatedAt: story.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Update success story error:', error);
      res.status(500).json({ error: 'Failed to update success story', details: error.message });
    }
  }

  public async deleteSuccessStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].id;

        const deleteQuery = `
          DELETE FROM success_stories 
          WHERE id = $1 AND user_id = $2
          RETURNING id
        `;

        const result = await client.query(deleteQuery, [id, userId]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        res.json({ success: true, message: 'Success story deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Delete success story error:', error);
      res.status(500).json({ error: 'Failed to delete success story', details: error.message });
    }
  }

  public async getMySuccessStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { page = 1, limit = 10 } = req.query;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);
      const client = await dbManager.getClient();

      try {
        const userQuery = 'SELECT id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].id;

        const query = `
          SELECT * FROM success_stories 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3
        `;

        const result = await client.query(query, [userId, Number(limit), offset]);

        res.json({
          success: true,
          stories: result.rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            businessName: row.business_name,
            businessType: row.business_type,
            sectors: row.sectors,
            countries: row.countries,
            impactMetrics: row.impact_metrics,
            images: row.images,
            isFeatured: row.is_featured,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get my success stories error:', error);
      res.status(500).json({ error: 'Failed to get success stories', details: error.message });
    }
  }
}
