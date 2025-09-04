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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const businessQuery = 'SELECT business_id, user_id, name_fr, name_en, business_type, region FROM business_profiles WHERE user_id = $1';
        const businessResult = await client.query(businessQuery, [userId]);
        
        if (businessResult.rows.length === 0) {
          res.status(404).json({ error: 'Business profile not found' });
          return;
        }

        const userProfile = businessResult.rows[0];

        let matchesQuery: string;
        let params: any[] = [userId];

        // Interpret `sectors` filter as industry/business_type filters depending on query
        const filterList = sectors ? (Array.isArray(sectors) ? sectors : [sectors]) : [];

        if (type === 'opportunities') {
          matchesQuery = `
            SELECT 
              o.opportunity_id,
              o.title_fr,
              o.title_en,
              o.description_fr,
              o.business_type,
              o.industry,
              o.estimated_value,
              o.currency,
              o.expiration_date,
              o.created_at,
              bp.name_fr as business_name,
              bp.business_type as creator_business_type,
              bp.region as creator_region,
              85 as match_score,
              ARRAY['Industry alignment', 'Geographic match', 'Business type compatibility'] as match_reasons
            FROM opportunities o
            JOIN users u ON o.created_by = u.user_id
            LEFT JOIN business_profiles bp ON bp.user_id = u.user_id
            WHERE o.status = 'active'
              AND o.created_by != $1
              ${filterList.length > 0 ? 'AND o.industry = ANY($2)' : ''}
            ORDER BY o.created_at DESC
            LIMIT $${filterList.length > 0 ? 3 : 2}
          `;
          params = filterList.length > 0 ? [userId, filterList, Number(limit)] : [userId, Number(limit)];
        } else {
          matchesQuery = `
            SELECT 
              bp.business_id,
              bp.user_id,
              bp.name_fr,
              bp.name_en,
              bp.business_type,
              bp.region,
              bp.created_at,
              80 as match_score,
              ARRAY['Sector overlap', 'Regional proximity', 'Business synergy'] as match_reasons
            FROM business_profiles bp
            WHERE bp.user_id != $1
              AND (
                bp.business_type = $2 OR
                bp.region = $3
              )
              ${filterList.length > 0 ? 'AND bp.business_type = ANY($4)' : ''}
            ORDER BY bp.created_at DESC
            LIMIT $${filterList.length > 0 ? 5 : 4}
          `;
          params = filterList.length > 0
            ? [userId, userProfile.business_type, userProfile.region, filterList, Number(limit)]
            : [userId, userProfile.business_type, userProfile.region, Number(limit)];
        }

        const result = await client.query(matchesQuery, params);

        res.json({
          success: true,
          matches: result.rows.map((row: any) => ({
            id: row.opportunity_id || row.business_id,
            businessName: row.business_name || row.name_fr,
            businessType: row.creator_business_type || row.business_type,
            region: row.creator_region || row.region,
            titleFr: row.title_fr,
            descriptionFr: row.description_fr,
            matchScore: row.match_score,
            matchReasons: row.match_reasons,
            industry: row.industry,
            estimatedValue: row.estimated_value,
            currency: row.currency,
            expirationDate: row.expiration_date
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
      const { businessId: inputBusinessId, opportunityId, matchScore, matchReasons } = req.body;

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

        // Resolve businessId: use provided one, otherwise default to the caller's primary business profile
        let businessId = inputBusinessId as string | undefined;
        if (!businessId) {
          const bpRes = await client.query(
            'SELECT business_id FROM business_profiles WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
            [userId]
          );
          if (bpRes.rows.length === 0) {
            res.status(400).json({ error: 'No business profile found for current user. Provide businessId explicitly.' });
            return;
          }
          businessId = bpRes.rows[0].business_id;
        }

        // Validate opportunity exists
        if (!opportunityId) {
          res.status(400).json({ error: 'opportunityId is required' });
          return;
        }
        const oppRes = await client.query(
          'SELECT opportunity_id FROM opportunities WHERE opportunity_id = $1',
          [opportunityId]
        );
        if (oppRes.rows.length === 0) {
          res.status(404).json({ error: 'Opportunity not found' });
          return;
        }

        // Prevent duplicate match for the same pair
        const existingQuery = `
          SELECT match_id FROM matches 
          WHERE business_id = $1 AND opportunity_id = $2
        `;
        const existingResult = await client.query(existingQuery, [businessId, opportunityId]);

        if (existingResult.rows.length > 0) {
          res.status(409).json({ error: 'Match already exists' });
          return;
        }

        const insertQuery = `
          INSERT INTO matches (
            business_id, opportunity_id, match_score, match_reason, status, created_at, updated_at, created_by
          ) VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW(), $5)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          businessId,
          opportunityId,
          matchScore ?? 75,
          (Array.isArray(matchReasons) ? matchReasons.join(', ') : (matchReasons ?? 'Manual match')),
          userId
        ]);

        const match = result.rows[0];

        res.status(201).json({
          success: true,
          match: {
            id: match.match_id,
            businessId: match.business_id,
            opportunityId: match.opportunity_id,
            matchScore: match.match_score,
            matchReason: match.match_reason,
            status: match.status,
            createdAt: match.created_at,
            updatedAt: match.updated_at,
            createdBy: match.created_by
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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        // Base SELECT with joins to enrich match info
        const baseSelect = `
          SELECT 
            m.match_id,
            m.business_id,
            m.opportunity_id,
            m.match_score,
            m.match_reason,
            m.status,
            m.created_at,
            m.updated_at,
            m.created_by,
            bp.name_fr AS business_name,
            bp.business_type,
            bp.region,
            o.title_fr AS opportunity_title,
            o.created_by AS opportunity_owner_id
          FROM matches m
          JOIN business_profiles bp ON m.business_id = bp.business_id
          JOIN opportunities o ON m.opportunity_id = o.opportunity_id
        `;

        const params: any[] = [userId];
        let query: string;

        if (type === 'received') {
          // Received: matches involving my businesses or my opportunities, not necessarily created by me
          query = baseSelect + `
            WHERE (bp.user_id = $1 OR o.created_by = $1)
          `;
        } else {
          // Sent (default): matches I created
          query = baseSelect + `
            WHERE m.created_by = $1
          `;
        }

        if (status) {
          params.push(status);
          query += ` AND m.status = $${params.length}`;
        }

        query += ' ORDER BY m.created_at DESC';

        const result = await client.query(query, params);

        res.json({
          success: true,
          matches: result.rows.map((row: any) => ({
            id: row.match_id,
            businessId: row.business_id,
            businessName: row.business_name,
            businessType: row.business_type,
            region: row.region,
            opportunityId: row.opportunity_id,
            opportunityTitle: row.opportunity_title,
            matchScore: row.match_score,
            matchReason: row.match_reason,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by
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
      const { id } = req.params; // match_id
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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        // Check authorization: user must be creator, opportunity owner, or business owner
        const authQuery = `
          SELECT m.match_id
          FROM matches m
          JOIN business_profiles bp ON m.business_id = bp.business_id
          JOIN opportunities o ON m.opportunity_id = o.opportunity_id
          WHERE m.match_id = $1
            AND ($2 = m.created_by OR $2 = bp.user_id OR $2 = o.created_by)
        `;
        const authRes = await client.query(authQuery, [id, userId]);
        if (authRes.rows.length === 0) {
          res.status(404).json({ error: 'Match not found or not authorized' });
          return;
        }

        const updateQuery = `
          UPDATE matches 
          SET status = $1, updated_at = NOW()
          WHERE match_id = $2
          RETURNING *
        `;

        const result = await client.query(updateQuery, [status, id]);

        res.json({
          success: true,
          match: {
            id: result.rows[0].match_id,
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
        const userQuery = 'SELECT user_id FROM users WHERE firebase_uid = $1';
        const userResult = await client.query(userQuery, [userUid]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const userId = userResult.rows[0].user_id;

        const statsQuery = `
          SELECT 
            COUNT(*) FILTER (WHERE m.status = 'pending') AS pending_matches,
            COUNT(*) FILTER (WHERE m.status = 'accepted') AS accepted_matches,
            COUNT(*) FILTER (WHERE m.status = 'rejected') AS rejected_matches,
            AVG(m.match_score) AS avg_match_score
          FROM matches m
          JOIN business_profiles bp ON m.business_id = bp.business_id
          JOIN opportunities o ON m.opportunity_id = o.opportunity_id
          WHERE m.created_by = $1 OR bp.user_id = $1 OR o.created_by = $1
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
