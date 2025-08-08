import { Request, Response } from 'express';
import { dbManager } from '../config/database';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

export class MatchingController {
  public async findMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { type = 'businesses', limit = 10, sectors } = req.query;

      const client = await dbManager.getClient();
      try {
        const userQuery = 'SELECT id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].id;

        const businessQuery = 'SELECT * FROM business_profiles WHERE user_id = $1';
        const businessResult = await client.query(businessQuery, [userId]);
        
        if (businessResult.rows.length === 0) {
          res.status(404).json({ error: 'Business profile not found' });
          return;
        }

        const userProfile = businessResult.rows[0];

        let matchesQuery: string;
        let params: any[] = [userId];

        // Parse sectors parameter - either use provided sectors or fall back to user's sectors
        const filterSectors = sectors ? 
          (Array.isArray(sectors) ? sectors : [sectors]) : 
          (userProfile.sectors || []);

        if (type === 'opportunities') {
          matchesQuery = `
            SELECT 
              o.*,
              bp.business_name,
              bp.business_type,
              bp.region,
              bp.logo_url,
              85 as match_score,
              ARRAY['Sector alignment', 'Geographic match', 'Business type compatibility'] as match_reasons
            FROM opportunities o
            JOIN business_profiles bp ON o.business_id = bp.id
            WHERE o.is_active = true
              AND o.business_id != (SELECT id FROM business_profiles WHERE user_id = $1)
              AND ARRAY_LENGTH(ARRAY(
                SELECT unnest(o.sectors) 
                INTERSECT 
                SELECT unnest($2::text[])
              ), 1) > 0
            ORDER BY o.created_at DESC
            LIMIT $3
          `;
          params = [userId, filterSectors, Number(limit)];
        } else {
          matchesQuery = `
            SELECT 
              bp.*,
              80 as match_score,
              ARRAY['Sector overlap', 'Regional proximity', 'Business synergy'] as match_reasons
            FROM business_profiles bp
            WHERE bp.user_id != $1
              AND ARRAY_LENGTH(ARRAY(
                SELECT unnest(bp.sectors) 
                INTERSECT 
                SELECT unnest($2::text[])
              ), 1) > 0
            ORDER BY bp.created_at DESC
            LIMIT $3
          `;
          params = [userId, filterSectors, Number(limit)];
        }

        const result = await client.query(matchesQuery, params);

        res.json({
          success: true,
          matches: result.rows.map((row: any) => ({
            id: row.id,
            businessName: row.business_name || row.business_name,
            businessType: row.business_type || row.business_type,
            region: row.region,
            logoUrl: row.logo_url,
            description: row.description || row.business_description,
            matchScore: row.match_score,
            matchReasons: row.match_reasons,
            sectors: row.sectors,
            countries: row.countries,
            amount: row.amount,
            currency: row.currency,
            deadline: row.deadline
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Find matches error:', error);
      res.status(500).json({ error: 'Failed to find matches', details: error.message });
    }
  }

  public async createMatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { targetUserId, opportunityId, matchScore, matchReasons } = req.body;

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

        const existingQuery = `
          SELECT id FROM matches 
          WHERE user_id = $1 AND target_user_id = $2 
          ${opportunityId ? 'AND opportunity_id = $3' : 'AND opportunity_id IS NULL'}
        `;
        
        const existingParams = opportunityId ? [userId, targetUserId, opportunityId] : [userId, targetUserId];
        const existingResult = await client.query(existingQuery, existingParams);

        if (existingResult.rows.length > 0) {
          res.status(409).json({ error: 'Match already exists' });
          return;
        }

        const insertQuery = `
          INSERT INTO matches (
            user_id, target_user_id, opportunity_id, match_score, 
            match_reasons, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          userId,
          targetUserId,
          opportunityId || null,
          matchScore || 75,
          JSON.stringify(matchReasons || ['Manual match'])
        ]);

        const match = result.rows[0];

        res.status(201).json({
          success: true,
          match: {
            id: match.id,
            userId: match.user_id,
            targetUserId: match.target_user_id,
            opportunityId: match.opportunity_id,
            matchScore: match.match_score,
            matchReasons: match.match_reasons,
            status: match.status,
            createdAt: match.created_at,
            updatedAt: match.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Create match error:', error);
      res.status(500).json({ error: 'Failed to create match', details: error.message });
    }
  }

  public async getMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { status, type } = req.query;

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

        let query = `
          SELECT 
            m.*,
            bp.business_name,
            bp.business_type,
            bp.region,
            bp.logo_url,
            o.title as opportunity_title
          FROM matches m
          JOIN business_profiles bp ON m.target_user_id = bp.user_id
          LEFT JOIN opportunities o ON m.opportunity_id = o.id
          WHERE m.user_id = $1
        `;

        const params = [userId];
        let paramCount = 1;

        if (status) {
          paramCount++;
          query += ` AND m.status = $${paramCount}`;
          params.push(status);
        }

        if (type === 'received') {
          query = `
            SELECT 
              m.*,
              bp.business_name,
              bp.business_type,
              bp.region,
              bp.logo_url,
              o.title as opportunity_title
            FROM matches m
            JOIN business_profiles bp ON m.user_id = bp.user_id
            LEFT JOIN opportunities o ON m.opportunity_id = o.id
            WHERE m.target_user_id = $1
          `;
          params[0] = userId;

          if (status) {
            paramCount++;
            query += ` AND m.status = $${paramCount}`;
            params.push(status);
          }
        }

        query += ' ORDER BY m.created_at DESC';

        const result = await client.query(query, params);

        res.json({
          success: true,
          matches: result.rows.map((row: any) => ({
            id: row.id,
            businessName: row.business_name,
            businessType: row.business_type,
            region: row.region,
            logoUrl: row.logo_url,
            opportunityTitle: row.opportunity_title,
            matchScore: row.match_score,
            matchReasons: row.match_reasons,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get matches error:', error);
      res.status(500).json({ error: 'Failed to get matches', details: error.message });
    }
  }

  public async updateMatchStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;
      const { status } = req.body;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!['accepted', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
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

        const matchQuery = 'SELECT * FROM matches WHERE id = $1 AND (user_id = $2 OR target_user_id = $2)';
        const matchResult = await client.query(matchQuery, [id, userId]);

        if (matchResult.rows.length === 0) {
          res.status(404).json({ error: 'Match not found' });
          return;
        }

        const updateQuery = `
          UPDATE matches 
          SET status = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;

        const result = await client.query(updateQuery, [status, id]);

        res.json({
          success: true,
          match: {
            id: result.rows[0].id,
            status: result.rows[0].status,
            updatedAt: result.rows[0].updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Update match status error:', error);
      res.status(500).json({ error: 'Failed to update match status', details: error.message });
    }
  }

  public async getMatchStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
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

        const statsQuery = `
          SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_matches,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_matches,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_matches,
            AVG(match_score) as avg_match_score
          FROM matches
          WHERE user_id = $1 OR target_user_id = $1
        `;

        const result = await client.query(statsQuery, [userId]);

        res.json({
          success: true,
          stats: {
            pendingMatches: parseInt(result.rows[0].pending_matches) || 0,
            acceptedMatches: parseInt(result.rows[0].accepted_matches) || 0,
            rejectedMatches: parseInt(result.rows[0].rejected_matches) || 0,
            averageMatchScore: parseFloat(result.rows[0].avg_match_score) || 0
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get match stats error:', error);
      res.status(500).json({ error: 'Failed to get match stats', details: error.message });
    }
  }
}
