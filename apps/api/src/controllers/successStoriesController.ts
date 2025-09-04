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
      const { title, description, images, status } = req.body;

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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        // Find the business profile for this user
        const bpQuery = 'SELECT business_id FROM business_profiles WHERE user_id = $1 LIMIT 1';
        const bpResult = await client.query(bpQuery, [userId]);
        if (bpResult.rows.length === 0) {
          res.status(400).json({ error: 'No business profile found for user' });
          return;
        }
        const businessId = bpResult.rows[0].business_id;

        const insertQuery = `
          INSERT INTO success_stories (
            business_id, title_fr, content_fr, media_urls, status, created_at, updated_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          businessId,
          title,
          description,
          JSON.stringify(images || []),
          status || 'published',
          userId
        ]);

        const story = result.rows[0];

        await this.notificationService.createSuccessStoryNotification(userId, story.story_id);

        res.status(201).json({
          success: true,
          story: {
            id: story.story_id,
            title: story.title_fr,
            description: story.content_fr,
            images: story.media_urls,
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
      const { page = 1, limit = 10, userId, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const client = await dbManager.getClient();
      try {
        let query = `
          SELECT 
            ss.story_id,
            ss.title_fr,
            ss.content_fr,
            ss.media_urls,
            ss.status,
            ss.created_at,
            ss.updated_at,
            bp.business_id,
            bp.name_fr AS business_name,
            bp.region,
            bp.business_type,
            u.firebase_uid
          FROM success_stories ss
          JOIN business_profiles bp ON ss.business_id = bp.business_id
          JOIN users u ON bp.user_id = u.user_id
          WHERE ss.status = 'published'
        `;

        const params: any[] = [Number(limit), offset];
        let paramCount = 2;

        if (userId) {
          paramCount++;
          query += ` AND bp.user_id = $${paramCount}`;
          params.push(userId);
        }

        if (search) {
          paramCount++;
          query += ` AND (ss.title_fr ILIKE $${paramCount} OR ss.content_fr ILIKE $${paramCount})`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY ss.created_at DESC LIMIT $1 OFFSET $2`;

        const result = await client.query(query, params);

        res.json({
          success: true,
          stories: result.rows.map((row: any) => ({
            id: row.story_id,
            title: row.title_fr,
            description: row.content_fr,
            images: row.media_urls,
            status: row.status,
            businessId: row.business_id,
            businessName: row.business_name,
            businessType: row.business_type,
            firebaseUid: row.firebase_uid,
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
            ss.story_id,
            ss.title_fr,
            ss.content_fr,
            ss.media_urls,
            ss.status,
            ss.created_at,
            ss.updated_at,
            bp.business_id,
            bp.name_fr AS business_name,
            bp.region,
            bp.business_type,
            u.firebase_uid
          FROM success_stories ss
          JOIN business_profiles bp ON ss.business_id = bp.business_id
          JOIN users u ON bp.user_id = u.user_id
          WHERE ss.story_id = $1 AND ss.status = 'published'
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
            id: story.story_id,
            title: story.title_fr,
            description: story.content_fr,
            images: story.media_urls,
            status: story.status,
            firebaseUid: story.firebase_uid,
            businessId: story.business_id,
            businessName: story.business_name,
            businessType: story.business_type,
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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const checkQuery = `
          SELECT ss.business_id, bp.user_id 
          FROM success_stories ss 
          JOIN business_profiles bp ON ss.business_id = bp.business_id 
          WHERE ss.story_id = $1
        `;
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        if (checkResult.rows[0].user_id !== userId) {
          res.status(403).json({ error: 'Unauthorized to update this story' });
          return;
        }

        const fields: string[] = [];
        const values = [];
        let paramCount = 1;

        if (updates.title) {
          paramCount++;
          fields.push(`title_fr = $${paramCount}`);
          values.push(updates.title);
        }

        if (updates.description) {
          paramCount++;
          fields.push(`content_fr = $${paramCount}`);
          values.push(updates.description);
        }

        if (updates.images) {
          paramCount++;
          fields.push(`media_urls = $${paramCount}`);
          values.push(JSON.stringify(updates.images));
        }

        if (updates.status) {
          paramCount++;
          fields.push(`status = $${paramCount}`);
          values.push(updates.status);
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
          WHERE story_id = $1
          RETURNING *
        `;

        values.unshift(id);

        const result = await client.query(updateQuery, values);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Success story not found' });
          return;
        }

        const story = result.rows[0];

        res.json({
          success: true,
          story: {
            id: story.story_id,
            title: story.title_fr,
            description: story.content_fr,
            images: story.media_urls,
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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        // Ensure ownership
        const checkQuery = `
          SELECT 1
          FROM success_stories ss
          JOIN business_profiles bp ON ss.business_id = bp.business_id
          WHERE ss.story_id = $1 AND bp.user_id = $2
        `;
        const own = await client.query(checkQuery, [id, userId]);
        if (own.rows.length === 0) {
          res.status(403).json({ error: 'Unauthorized to delete this story' });
          return;
        }

        const deleteQuery = `
          DELETE FROM success_stories 
          WHERE story_id = $1
          RETURNING story_id
        `;

        const result = await client.query(deleteQuery, [id]);

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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const query = `
          SELECT 
            ss.story_id,
            ss.title_fr,
            ss.content_fr,
            ss.media_urls,
            ss.status,
            ss.created_at,
            ss.updated_at
          FROM success_stories ss
          JOIN business_profiles bp ON ss.business_id = bp.business_id
          WHERE bp.user_id = $1
          ORDER BY ss.created_at DESC 
          LIMIT $2 OFFSET $3
        `;

        const result = await client.query(query, [userId, Number(limit), offset]);

        res.json({
          success: true,
          stories: result.rows.map((row: any) => ({
            id: row.story_id,
            title: row.title_fr,
            description: row.content_fr,
            images: row.media_urls,
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
