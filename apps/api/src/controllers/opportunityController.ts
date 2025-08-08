import { Request, Response } from 'express';
import { dbManager } from '../config/database';

// Translation service can be added for multi-language support (fr/mg/en)
// import { TranslationService } from '../services/translationService';
import { NotificationService } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

export class OpportunityController {
  private notificationService: NotificationService | null = null;

  constructor() {
    try {
      this.notificationService = NotificationService.getInstance();
    } catch (error) {
      console.warn('⚠️ Failed to initialize NotificationService:', error);
      this.notificationService = null;
    }
  }

  public async createOpportunity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        title_fr,
        title_mg,
        title_en,
        description_fr,
        description_mg,
        description_en,
        business_type,
        target_countries,
        industry,
        estimated_value,
        currency,
        expiration_date
      } = req.body;

      // Validate required fields
      if (!title_fr || !description_fr || !business_type) {
        res.status(400).json({ error: 'title_fr, description_fr, and business_type are required' });
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

        const insertQuery = `
          INSERT INTO opportunities (
            title_fr, title_mg, title_en, description_fr, description_mg, description_en,
            business_type, target_countries, industry, estimated_value, currency, 
            expiration_date, status, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          title_fr,
          title_mg || null,
          title_en || null,
          description_fr,
          description_mg || null,
          description_en || null,
          business_type,
          JSON.stringify(target_countries || []),
          industry || null,
          estimated_value || null,
          currency || 'MGA',
          expiration_date || null,
          'active',
          userId
        ]);

        const opportunity = result.rows[0];

        // Send notification if service is available
        try {
          if (this.notificationService) {
            await this.notificationService.createOpportunityNotification(
              opportunity.opportunity_id,
              userId
            );
          }
        } catch (notificationError) {
          console.warn('⚠️ Failed to send opportunity notification:', notificationError);
          // Don't fail the entire request if notification fails
        }

        res.status(201).json({
          success: true,
          opportunity: {
            id: opportunity.opportunity_id,
            titleFr: opportunity.title_fr,
            titleMg: opportunity.title_mg,
            titleEn: opportunity.title_en,
            descriptionFr: opportunity.description_fr,
            descriptionMg: opportunity.description_mg,
            descriptionEn: opportunity.description_en,
            businessType: opportunity.business_type,
            targetCountries: opportunity.target_countries,
            industry: opportunity.industry,
            estimatedValue: opportunity.estimated_value,
            currency: opportunity.currency,
            expirationDate: opportunity.expiration_date,
            status: opportunity.status,
            createdBy: opportunity.created_by,
            createdAt: opportunity.created_at,
            updatedAt: opportunity.updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Create opportunity error:', error);
      res.status(500).json({ error: 'Failed to create opportunity', details: error.message });
    }
  }

  public async getOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        sectors,
        countries,
        minAmount,
        maxAmount,
        search
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const client = await dbManager.getClient();

      try {
        let query = `
          SELECT 
            o.*,
            u.email as creator_email,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            bp.name_fr as business_name_fr,
            bp.name_en as business_name_en,
            bp.business_type as creator_business_type,
            bp.region as creator_region
          FROM opportunities o
          LEFT JOIN users u ON o.created_by = u.user_id
          LEFT JOIN business_profiles bp ON bp.user_id = u.user_id
          WHERE o.status = 'active'
        `;

        const params: any[] = [];
        let paramCount = 0;

        // Filter by business type
        if (type) {
          paramCount++;
          query += ` AND o.business_type = $${paramCount}`;
          params.push(type);
        }

        // Filter by sectors (using industry field)
        if (sectors) {
          const sectorList = Array.isArray(sectors) ? sectors : [sectors];
          paramCount++;
          query += ` AND o.industry = ANY($${paramCount})`;
          params.push(sectorList);
        }

        // Filter by countries (using target_countries JSONB field)
        if (countries) {
          const countryList = Array.isArray(countries) ? countries : [countries];
          paramCount++;
          query += ` AND o.target_countries ?| $${paramCount}`;
          params.push(countryList);
        }

        // Filter by minimum amount (estimated_value)
        if (minAmount) {
          paramCount++;
          query += ` AND o.estimated_value >= $${paramCount}`;
          params.push(Number(minAmount));
        }

        // Filter by maximum amount (estimated_value)
        if (maxAmount) {
          paramCount++;
          query += ` AND o.estimated_value <= $${paramCount}`;
          params.push(Number(maxAmount));
        }

        // Search in title and description fields
        if (search) {
          paramCount++;
          query += ` AND (
            o.title_fr ILIKE $${paramCount} OR 
            o.title_en ILIKE $${paramCount} OR 
            o.title_mg ILIKE $${paramCount} OR
            o.description_fr ILIKE $${paramCount} OR 
            o.description_en ILIKE $${paramCount} OR
            o.description_mg ILIKE $${paramCount}
          )`;
          params.push(`%${search}%`);
        }

        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(Number(limit), offset);

        const result = await client.query(query, params);

        // Count query for pagination
        let countQuery = 'SELECT COUNT(*) FROM opportunities o WHERE o.status = \'active\'';
        const countParams: any[] = [];
        let countParamCount = 0;

        if (type) {
          countParamCount++;
          countQuery += ` AND o.business_type = $${countParamCount}`;
          countParams.push(type);
        }

        if (sectors) {
          const sectorList = Array.isArray(sectors) ? sectors : [sectors];
          countParamCount++;
          countQuery += ` AND o.industry = ANY($${countParamCount})`;
          countParams.push(sectorList);
        }

        if (countries) {
          const countryList = Array.isArray(countries) ? countries : [countries];
          countParamCount++;
          countQuery += ` AND o.target_countries ?| $${countParamCount}`;
          countParams.push(countryList);
        }

        if (minAmount) {
          countParamCount++;
          countQuery += ` AND o.estimated_value >= $${countParamCount}`;
          countParams.push(Number(minAmount));
        }

        if (maxAmount) {
          countParamCount++;
          countQuery += ` AND o.estimated_value <= $${countParamCount}`;
          countParams.push(Number(maxAmount));
        }

        if (search) {
          countParamCount++;
          countQuery += ` AND (
            o.title_fr ILIKE $${countParamCount} OR 
            o.title_en ILIKE $${countParamCount} OR 
            o.title_mg ILIKE $${countParamCount} OR
            o.description_fr ILIKE $${countParamCount} OR 
            o.description_en ILIKE $${countParamCount} OR
            o.description_mg ILIKE $${countParamCount}
          )`;
          countParams.push(`%${search}%`);
        }

        const countResult = await client.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
          success: true,
          opportunities: result.rows.map(row => ({
            opportunityId: row.opportunity_id,
            titleFr: row.title_fr,
            titleMg: row.title_mg,
            titleEn: row.title_en,
            descriptionFr: row.description_fr,
            descriptionMg: row.description_mg,
            descriptionEn: row.description_en,
            businessType: row.business_type,
            targetCountries: row.target_countries,
            industry: row.industry,
            estimatedValue: row.estimated_value,
            currency: row.currency,
            expirationDate: row.expiration_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            // Additional creator info from joins
            creatorEmail: row.creator_email,
            creatorFirstName: row.creator_first_name,
            creatorLastName: row.creator_last_name,
            creatorBusinessNameFr: row.business_name_fr,
            creatorBusinessNameEn: row.business_name_en,
            creatorBusinessType: row.creator_business_type,
            creatorRegion: row.creator_region
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get opportunities error:', error);
      res.status(500).json({ error: 'Failed to get opportunities', details: error.message });
    }
  }

  public async getOpportunity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const client = await dbManager.getClient();
      try {
        const query = `
          SELECT 
            o.*,
            u.email as creator_email,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            bp.name_fr as business_name_fr,
            bp.name_en as business_name_en,
            bp.name_mg as business_name_mg,
            bp.business_type as creator_business_type,
            bp.region as creator_region,
            bp.description_fr as business_description_fr,
            bp.description_en as business_description_en,
            bp.description_mg as business_description_mg
          FROM opportunities o
          LEFT JOIN users u ON o.created_by = u.user_id
          LEFT JOIN business_profiles bp ON bp.user_id = u.user_id
          WHERE o.opportunity_id = $1 AND o.status = 'active'
        `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Opportunity not found' });
          return;
        }

        const opportunity = result.rows[0];

        res.json({
          success: true,
          opportunity: {
            opportunityId: opportunity.opportunity_id,
            titleFr: opportunity.title_fr,
            titleMg: opportunity.title_mg,
            titleEn: opportunity.title_en,
            descriptionFr: opportunity.description_fr,
            descriptionMg: opportunity.description_mg,
            descriptionEn: opportunity.description_en,
            businessType: opportunity.business_type,
            targetCountries: opportunity.target_countries,
            industry: opportunity.industry,
            estimatedValue: opportunity.estimated_value,
            currency: opportunity.currency,
            expirationDate: opportunity.expiration_date,
            status: opportunity.status,
            createdAt: opportunity.created_at,
            updatedAt: opportunity.updated_at,
            createdBy: opportunity.created_by,
            // Additional creator info from joins
            creatorEmail: opportunity.creator_email,
            creatorFirstName: opportunity.creator_first_name,
            creatorLastName: opportunity.creator_last_name,
            creatorBusinessNameFr: opportunity.business_name_fr,
            creatorBusinessNameEn: opportunity.business_name_en,
            creatorBusinessNameMg: opportunity.business_name_mg,
            creatorBusinessType: opportunity.creator_business_type,
            creatorRegion: opportunity.creator_region,
            businessDescriptionFr: opportunity.business_description_fr,
            businessDescriptionEn: opportunity.business_description_en,
            businessDescriptionMg: opportunity.business_description_mg
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get opportunity error:', error);
      res.status(500).json({ error: 'Failed to get opportunity', details: error.message });
    }
  }

  public async updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const {
        title_fr,
        title_mg,
        title_en,
        description_fr,
        description_mg,
        description_en,
        business_type,
        target_countries,
        industry,
        estimated_value,
        currency,
        expiration_date,
        status
      } = req.body;

      const client = await dbManager.getClient();
      try {
        const ownershipQuery = `
          SELECT o.opportunity_id 
          FROM opportunities o
          JOIN users u ON o.created_by = u.user_id
          WHERE o.opportunity_id = $1 AND u.firebase_uid = $2
        `;
        const ownershipResult = await client.query(ownershipQuery, [id, userUid]);

        if (ownershipResult.rows.length === 0) {
          res.status(403).json({ error: 'Not authorized to update this opportunity' });
          return;
        }

        const updateQuery = `
          UPDATE opportunities 
          SET title_fr = $1,
              title_mg = $2,
              title_en = $3,
              description_fr = $4,
              description_mg = $5,
              description_en = $6,
              business_type = $7,
              target_countries = $8,
              industry = $9,
              estimated_value = $10,
              currency = $11,
              expiration_date = $12,
              status = $13,
              updated_at = NOW()
          WHERE opportunity_id = $14
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          title_fr,
          title_mg,
          title_en,
          description_fr,
          description_mg,
          description_en,
          business_type,
          target_countries ? JSON.stringify(target_countries) : null, // Convert to JSON string for JSONB
          industry,
          estimated_value,
          currency,
          expiration_date,
          status || 'active',
          id
        ]);

        res.json({
          success: true,
          opportunity: {
            opportunityId: result.rows[0].opportunity_id,
            titleFr: result.rows[0].title_fr,
            titleMg: result.rows[0].title_mg,
            titleEn: result.rows[0].title_en,
            descriptionFr: result.rows[0].description_fr,
            descriptionMg: result.rows[0].description_mg,
            descriptionEn: result.rows[0].description_en,
            businessType: result.rows[0].business_type,
            targetCountries: result.rows[0].target_countries,
            industry: result.rows[0].industry,
            estimatedValue: result.rows[0].estimated_value,
            currency: result.rows[0].currency,
            expirationDate: result.rows[0].expiration_date,
            status: result.rows[0].status,
            updatedAt: result.rows[0].updated_at
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Update opportunity error:', error);
      res.status(500).json({ error: 'Failed to update opportunity', details: error.message });
    }
  }

  public async deleteOpportunity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      const { id } = req.params;

      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const ownershipQuery = `
          SELECT o.opportunity_id 
          FROM opportunities o
          JOIN users u ON o.created_by = u.user_id
          WHERE o.opportunity_id = $1 AND u.firebase_uid = $2
        `;
        const ownershipResult = await client.query(ownershipQuery, [id, userUid]);

        if (ownershipResult.rows.length === 0) {
          res.status(403).json({ error: 'Not authorized to delete this opportunity' });
          return;
        }

        const deleteQuery = 'UPDATE opportunities SET status = \'closed\' WHERE opportunity_id = $1';
        await client.query(deleteQuery, [id]);

        res.json({ success: true, message: 'Opportunity deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Delete opportunity error:', error);
      res.status(500).json({ error: 'Failed to delete opportunity', details: error.message });
    }
  }

  public async getMyOpportunities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userUid = req.user?.uid;
      if (!userUid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const client = await dbManager.getClient();
      try {
        const query = `
          SELECT 
            o.*,
            bp.name_fr as business_name_fr,
            bp.name_en as business_name_en,
            bp.name_mg as business_name_mg,
            bp.business_type as creator_business_type,
            bp.region as creator_region
          FROM opportunities o
          JOIN users u ON o.created_by = u.user_id
          LEFT JOIN business_profiles bp ON bp.user_id = u.user_id
          WHERE u.firebase_uid = $1
          ORDER BY o.created_at DESC
        `;

        const result = await client.query(query, [userUid]);

        res.json({
          success: true,
          opportunities: result.rows.map(row => ({
            opportunityId: row.opportunity_id,
            titleFr: row.title_fr,
            titleMg: row.title_mg,
            titleEn: row.title_en,
            descriptionFr: row.description_fr,
            descriptionMg: row.description_mg,
            descriptionEn: row.description_en,
            businessType: row.business_type,
            targetCountries: row.target_countries,
            industry: row.industry,
            estimatedValue: row.estimated_value,
            currency: row.currency,
            expirationDate: row.expiration_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            // Creator business info
            creatorBusinessNameFr: row.business_name_fr,
            creatorBusinessNameEn: row.business_name_en,
            creatorBusinessNameMg: row.business_name_mg,
            creatorBusinessType: row.creator_business_type,
            creatorRegion: row.creator_region
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Get my opportunities error:', error);
      res.status(500).json({ error: 'Failed to get opportunities', details: error.message });
    }
  }
}
