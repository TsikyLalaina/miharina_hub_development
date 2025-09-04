// apps/api/src/controllers/businessProfileController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { setCustomClaims } from '../config/firebase';
import { AuthenticatedRequest, BusinessAuthenticatedRequest } from '../types/express';
import { getUserIdByFirebaseUid } from '../utils/userMapping';


export interface BusinessProfile {
  id: string;
  userId: string;
  nameFr: string;
  nameMg?: string;
  nameEn?: string;
  descriptionFr: string;
  descriptionMg?: string;
  descriptionEn?: string;
  businessType: string;
  region: string;
  registrationNumber?: string;
  contactPhone: string;
  contactEmail?: string;
  websiteUrl?: string;
  verified: boolean;
  verificationStatus: string;
  exportInterests?: any;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BusinessProfileController {

  /**
   * Create a new business profile
   */
  public createBusinessProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }

      // Map Firebase UID to database UUID
      const userId = await getUserIdByFirebaseUid(user.uid);

      // Check if user already has a business profile
      const existingProfile = await query(`
        SELECT business_id FROM business_profiles 
        WHERE user_id = $1
      `, [userId]);

      if (existingProfile.rows.length > 0) {
        res.status(409).json({
          error: 'Business profile already exists',
          error_fr: 'Le profil d\'entreprise existe déjà',
          error_mg: 'Efa misy ny mombamomba ny orinasa'
        });
        return;
      }

      const {
        nameFr,
        nameMg,
        nameEn,
        descriptionFr,
        descriptionMg,
        descriptionEn,
        businessType,
        region,
        registrationNumber,
        contactPhone,
        contactEmail,
        websiteUrl,
        exportInterests = {},
        currency = 'MGA'
      } = req.body;

      // Validate required fields
      if (!nameFr || !descriptionFr || !businessType || !region || !contactPhone) {
        res.status(400).json({
          error: 'Missing required fields',
          error_fr: 'Champs obligatoires manquants',
          error_mg: 'Misy saha ilaina tsy voasoratra'
        });
        return;
      }

      // Validate region
      const validRegions = ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'];
      if (!validRegions.includes(region)) {
        res.status(400).json({
          error: 'Invalid region',
          error_fr: 'Région invalide',
          error_mg: 'Faritra tsy mety'
        });
        return;
      }

      // Validate business type
      const validBusinessTypes = ['agricultural', 'artisan', 'digital_services', 'manufacturing'];
      if (!validBusinessTypes.includes(businessType)) {
        res.status(400).json({
          error: 'Invalid business type',
          error_fr: 'Type d\'entreprise invalide',
          error_mg: 'Karazana orinasa tsy mety'
        });
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+261[0-9]{9}$/;
      if (!phoneRegex.test(contactPhone)) {
        res.status(400).json({
          error: 'Invalid phone number format. Must be +261XXXXXXXXX',
          error_fr: 'Format de numéro de téléphone invalide. Doit être +261XXXXXXXXX',
          error_mg: 'Endrika laharan-telefaona tsy mety. Tokony ho +261XXXXXXXXX'
        });
        return;
      }

      const profileId = uuidv4();

      // Create business profile in transaction
      await transaction(async (client) => {
        // Insert business profile
        await client.query(`
          INSERT INTO business_profiles (
            business_id, user_id, name_fr, name_mg, name_en, 
            description_fr, description_mg, description_en,
            business_type, region, registration_number, 
            contact_phone, contact_email, website_url,
            is_verified, verification_status, export_interests,
            currency, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, 'pending', $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `, [profileId, userId, nameFr, nameMg || null, nameEn || null, descriptionFr, descriptionMg || null, descriptionEn || null, businessType, region, registrationNumber || null, contactPhone, contactEmail || null, websiteUrl || null, JSON.stringify(exportInterests), currency, userId]);

        // Update Firebase custom claims
        await setCustomClaims(user.uid, {
          businessType: businessType as any,
          region: region as any,
          verified: false,
          country: 'madagascar',
          role: 'entrepreneur',
          createdAt: Date.now(),
          lastLogin: Date.now(),
        });
      });

      // Fetch the created profile
      const newProfile = await this.getBusinessProfileFromDb(profileId);

      res.status(201).json({
        message: 'Business profile created successfully',
        message_fr: 'Profil d\'entreprise créé avec succès',
        message_mg: 'Voaforona soa aman-tsara ny mombamomba ny orinasa',
        data: newProfile
      });

    } catch (error) {
      console.error('Create business profile error:', error);
      res.status(500).json({
        error: 'Failed to create business profile',
        error_fr: 'Échec de la création du profil d\'entreprise',
        error_mg: 'Tsy voaforona ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Create a business profile on behalf of another user (admin/partner)
   * Body: { targetFirebaseUid, nameFr, descriptionFr, businessType, region, ... }
   */
  public createBusinessProfileForUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const actor = req.user;
      if (!actor) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        targetFirebaseUid,
        nameFr,
        nameMg,
        nameEn,
        descriptionFr,
        descriptionMg,
        descriptionEn,
        businessType,
        region,
        registrationNumber,
        contactPhone,
        contactEmail,
        websiteUrl,
        exportInterests = {},
        currency = 'MGA'
      } = req.body || {};

      if (!targetFirebaseUid) {
        res.status(400).json({ error: 'targetFirebaseUid is required' });
        return;
      }

      // Validate required fields
      if (!nameFr || !descriptionFr || !businessType || !region || !contactPhone) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate region
      const validRegions = ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'];
      if (!validRegions.includes(region)) {
        res.status(400).json({ error: 'Invalid region' });
        return;
      }

      // Validate business type
      const validBusinessTypes = ['agricultural', 'artisan', 'digital_services', 'manufacturing'];
      if (!validBusinessTypes.includes(businessType)) {
        res.status(400).json({ error: 'Invalid business type' });
        return;
      }

      // Validate phone number format
      const phoneRegex = /^\+261[0-9]{9}$/;
      if (!phoneRegex.test(contactPhone)) {
        res.status(400).json({ error: 'Invalid phone number format. Must be +261XXXXXXXXX' });
        return;
      }

      // Resolve actor and target ids
      const actorUserId = await getUserIdByFirebaseUid(actor.uid);
      const targetUserId = await getUserIdByFirebaseUid(targetFirebaseUid);

      // Ensure target has no existing profile
      const existingProfile = await query(`
        SELECT business_id FROM business_profiles WHERE user_id = $1
      `, [targetUserId]);
      if (existingProfile.rows.length > 0) {
        res.status(409).json({ error: 'Target user already has a business profile' });
        return;
      }

      const profileId = uuidv4();

      await transaction(async (client) => {
        await client.query(`
          INSERT INTO business_profiles (
            business_id, user_id, name_fr, name_mg, name_en,
            description_fr, description_mg, description_en,
            business_type, region, registration_number,
            contact_phone, contact_email, website_url,
            is_verified, verification_status, export_interests,
            currency, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            false, 'pending', $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) RETURNING *
        `, [
          profileId,
          targetUserId,
          nameFr,
          nameMg || null,
          nameEn || null,
          descriptionFr,
          descriptionMg || null,
          descriptionEn || null,
          businessType,
          region,
          registrationNumber || null,
          contactPhone,
          contactEmail || null,
          websiteUrl || null,
          JSON.stringify(exportInterests),
          currency,
          actorUserId
        ]);

        // Update target user's Firebase custom claims
        await setCustomClaims(targetFirebaseUid, {
          businessType: businessType as any,
          region: region as any,
          verified: false,
          country: 'madagascar',
          role: 'entrepreneur',
          createdAt: Date.now(),
          lastLogin: Date.now(),
        });
      });

      const newProfile = await this.getBusinessProfileFromDb(profileId);

      res.status(201).json({
        message: 'Business profile created for target user',
        data: newProfile
      });
    } catch (error) {
      console.error('Create business profile for user error:', error);
      res.status(500).json({ error: 'Failed to create business profile for target user' });
    }
  };

  /**
   * Get current user's business profile
   */
  public getOwnBusinessProfile = async (req: BusinessAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }

      // Map Firebase UID to database UUID
      const userId = await getUserIdByFirebaseUid(user.uid);
      const profile = await this.getBusinessProfileByUserId(userId);

      if (!profile) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      res.json({
        data: profile
      });

    } catch (error) {
      console.error('Get own business profile error:', error);
      res.status(500).json({
        error: 'Failed to fetch business profile',
        error_fr: 'Échec de la récupération du profil d\'entreprise',
        error_mg: 'Tsy voaray ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Update current user's business profile
   */
  public updateOwnBusinessProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }
      const userId = user.uid;

      const updates = req.body;
      const allowedFields = [
        'nameFr', 'nameMg', 'nameEn',
        'descriptionFr', 'descriptionMg', 'descriptionEn',
        'registrationNumber', 'contactPhone', 'contactEmail',
        'websiteUrl', 'exportInterests'
      ];

      // Filter only allowed fields
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      if (Object.keys(filteredUpdates).length === 0) {
        res.status(400).json({
          error: 'No valid fields to update',
          error_fr: 'Aucun champ valide à mettre à jour',
          error_mg: 'Tsy misy saha azo avaozina'
        });
        return;
      }

      // Validate phone number if provided
      if (filteredUpdates.contactPhone) {
        const phoneRegex = /^\+261[0-9]{9}$/;
        if (!phoneRegex.test(filteredUpdates.contactPhone)) {
          res.status(400).json({
            error: 'Invalid phone number format. Must be +261XXXXXXXXX',
            error_fr: 'Format de numéro de téléphone invalide. Doit être +261XXXXXXXXX',
            error_mg: 'Endrika laharan-telefaona tsy mety. Tokony ho +261XXXXXXXXX'
          });
          return;
        }
      }

      await transaction(async (client) => {
        // Build dynamic update query
        const setClause = Object.keys(filteredUpdates).map((key, index) => {
          const dbField = this.camelToSnake(key);
          if (key === 'exportInterests') {
            return `${dbField} = $${index + 2}::jsonb`;
          }
          return `${dbField} = $${index + 2}`;
        }).join(', ');

        const values = [
          userId,
          ...Object.keys(filteredUpdates).map(key =>
            key === 'exportInterests' ? JSON.stringify(filteredUpdates[key]) : filteredUpdates[key]
          )
        ];

        await client.query(`
          UPDATE business_profiles 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, values);
      });

      // Fetch updated profile
      const updatedProfile = await query(`
        SELECT * FROM business_profiles WHERE user_id = $1
      `, [userId]);

      const profile = this.formatBusinessProfile(updatedProfile.rows[0]);

      res.json({
        message: 'Business profile updated successfully',
        message_fr: 'Profil d\'entreprise mis à jour avec succès',
        message_mg: 'Voaavaozina soa aman-tsara ny mombamomba ny orinasa',
        data: profile
      });

    } catch (error) {
      console.error('Update business profile error:', error);
      res.status(500).json({
        error: 'Failed to update business profile',
        error_fr: 'Échec de la mise à jour du profil d\'entreprise',
        error_mg: 'Tsy voaavaozina ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Delete current user's business profile
   */
  public deleteOwnBusinessProfile = async (req: BusinessAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }
      const userId = user.uid;

      // Map Firebase UID to database UUID
      const userIdDb = await getUserIdByFirebaseUid(userId);

      const result = await query(`
        DELETE FROM business_profiles 
        WHERE user_id = $1
        RETURNING business_id
      `, [userIdDb]);

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      res.json({
        message: 'Business profile deleted successfully',
        message_fr: 'Profil d\'entreprise supprimé avec succès',
        message_mg: 'Voafafa soa aman-tsara ny mombamomba ny orinasa'
      });

    } catch (error) {
      console.error('Delete business profile error:', error);
      res.status(500).json({
        error: 'Failed to delete business profile',
        error_fr: 'Échec de la suppression du profil d\'entreprise',
        error_mg: 'Tsy voafafa ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Search business profiles
   */
  public searchBusinessProfiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        query: searchQuery = '',
        businessType = 'all',
        region = 'all',
        verified,
        page = 1,
        limit = 20,
        language = 'fr'
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const limitNum = Math.min(Number(limit), 100);

      // Build WHERE conditions
      const conditions = ['1=1'];
      const values: any[] = [];
      let paramCount = 0;

      if (searchQuery) {
        paramCount++;
        if (language === 'mg') {
          conditions.push(`(
            name_mg ILIKE $${paramCount} OR 
            description_mg ILIKE $${paramCount} OR
            to_tsvector('simple', COALESCE(name_mg, '') || ' ' || COALESCE(description_mg, '')) @@ plainto_tsquery('simple', $${paramCount})
          )`);
        } else if (language === 'en') {
          conditions.push(`(
            name_en ILIKE $${paramCount} OR 
            description_en ILIKE $${paramCount} OR
            to_tsvector('english', COALESCE(name_en, '') || ' ' || COALESCE(description_en, '')) @@ plainto_tsquery('english', $${paramCount})
          )`);
        } else {
          conditions.push(`(
            name_fr ILIKE $${paramCount} OR 
            description_fr ILIKE $${paramCount} OR
            to_tsvector('french', name_fr || ' ' || description_fr) @@ plainto_tsquery('french', $${paramCount})
          )`);
        }
        values.push(`%${searchQuery}%`);
      }

      if (businessType !== 'all') {
        paramCount++;
        conditions.push(`business_type = $${paramCount}`);
        values.push(businessType);
      }

      if (region !== 'all') {
        paramCount++;
        conditions.push(`region = $${paramCount}`);
        values.push(region);
      }

      if (verified !== undefined) {
        paramCount++;
        conditions.push(`is_verified = $${paramCount}`);
        values.push(verified === 'true');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get total count
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM business_profiles
        ${whereClause}
      `, values);

      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const searchResult = await query(`
        SELECT 
          business_id, user_id, name_fr, name_mg, name_en,
          description_fr, description_mg, description_en,
          business_type, region, registration_number,
          contact_phone, contact_email, website_url,
          is_verified, verification_status, export_interests,
          currency, created_at, updated_at
        FROM business_profiles
        ${whereClause}
        ORDER BY 
          CASE WHEN is_verified THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...values, limitNum, offset]);

      const profiles = searchResult.rows.map(this.formatBusinessProfile);

      res.json({
        data: profiles,
        pagination: {
          page: Number(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          query: searchQuery,
          businessType,
          region,
          verified,
          language
        }
      });

    } catch (error) {
      console.error('Search business profiles error:', error);
      res.status(500).json({
        error: 'Failed to search business profiles',
        error_fr: 'Échec de la recherche de profils d\'entreprise',
        error_mg: 'Tsy voakaroka ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Get business profile by ID
   */
  public getBusinessProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: 'Business profile ID is required',
          error_fr: 'L\'ID du profil d\'entreprise est requis',
          error_mg: 'Ilaina ny ID-n\'ny mombamomba ny orinasa'
        });
        return;
      }

      const profile = await this.getBusinessProfileFromDb(id);

      if (!profile) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      res.json({
        data: profile
      });

    } catch (error) {
      console.error('Get business profile by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch business profile',
        error_fr: 'Échec de la récupération du profil d\'entreprise',
        error_mg: 'Tsy voaray ny mombamomba ny orinasa'
      });
    }
  };

  /**
   * Get business statistics
   */
  public getBusinessStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await query(`
        SELECT 
          COUNT(*) as total_businesses,
          COUNT(CASE WHEN is_verified THEN 1 END) as verified_businesses,
          COUNT(CASE WHEN business_type = 'agricultural' THEN 1 END) as agricultural,
          COUNT(CASE WHEN business_type = 'artisan' THEN 1 END) as artisan,
          COUNT(CASE WHEN business_type = 'digital_services' THEN 1 END) as digital_services,
          COUNT(CASE WHEN business_type = 'manufacturing' THEN 1 END) as manufacturing,
          COUNT(CASE WHEN region = 'Antananarivo' THEN 1 END) as antananarivo,
          COUNT(CASE WHEN region = 'Fianarantsoa' THEN 1 END) as fianarantsoa,
          COUNT(CASE WHEN region = 'Toamasina' THEN 1 END) as toamasina,
          COUNT(CASE WHEN region = 'Mahajanga' THEN 1 END) as mahajanga,
          COUNT(CASE WHEN region = 'Toliara' THEN 1 END) as toliara,
          COUNT(CASE WHEN region = 'Antsiranana' THEN 1 END) as antsiranana
        FROM business_profiles
      `);

      res.json({
        data: stats.rows[0]
      });

    } catch (error) {
      console.error('Get business stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch business statistics',
        error_fr: 'Échec de la récupération des statistiques d\'entreprise',
        error_mg: 'Tsy voaray ny antontan\'isa momba ny orinasa'
      });
    }
  };

  /**
   * Get similar businesses
   */
  public getSimilarBusinesses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: 'Business profile ID is required',
          error_fr: 'L\'ID du profil d\'entreprise est requis',
          error_mg: 'Ilaina ny ID-n\'ny mombamomba ny orinasa'
        });
        return;
      }

      const limit = Math.min(Number(req.query['limit']) || 5, 20);

      // Get the reference business profile
      const referenceProfile = await this.getBusinessProfileFromDb(id);
      if (!referenceProfile) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      // Find similar businesses based on business type and region
      const similarBusinesses = await query(`
        SELECT 
          business_id, user_id, name_fr, name_mg, name_en,
          description_fr, description_mg, description_en,
          business_type, region, is_verified, created_at
        FROM business_profiles
        WHERE business_id != $1
        AND (
          business_type = $2 OR 
          region = $3
        )
        ORDER BY 
          CASE WHEN business_type = $2 THEN 3 ELSE 0 END +
          CASE WHEN region = $3 THEN 2 ELSE 0 END +
          CASE WHEN is_verified THEN 1 ELSE 0 END DESC,
          created_at DESC
        LIMIT $4
      `, [
        id,
        referenceProfile.businessType,
        referenceProfile.region,
        limit
      ]);

      const profiles = similarBusinesses.rows.map(this.formatBusinessProfile);

      res.json({
        data: profiles
      });

    } catch (error) {
      console.error('Get similar businesses error:', error);
      res.status(500).json({
        error: 'Failed to fetch similar businesses',
        error_fr: 'Échec de la récupération d\'entreprises similaires',
        error_mg: 'Tsy voaray ny orinasa mitovy'
      });
    }
  };

  /**
   * Update business profile
   */
  public updateBusinessProfile = async (req: BusinessAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }

      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: 'Business ID is required',
          error_fr: 'ID d\'entreprise requis',
          error_mg: 'Ilaina ny ID orinasa'
        });
        return;
      }

      // Map Firebase UID to database UUID
      const userId = await getUserIdByFirebaseUid(user.uid);

      // Verify ownership
      const businessProfile = await this.getBusinessProfileFromDb(id);
      if (!businessProfile || businessProfile.userId !== userId) {
        res.status(403).json({
          error: 'Access denied',
          error_fr: 'Accès refusé',
          error_mg: 'Tsy afaka miditra'
        });
        return;
      }

      const updates = req.body;
      const validFields = ['nameFr', 'nameMg', 'nameEn', 'descriptionFr', 'descriptionMg', 'descriptionEn', 'businessType', 'region', 'registrationNumber', 'exportInterests', 'contactPhone', 'contactEmail', 'websiteUrl', 'isVerified', 'verificationStatus', 'currency'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => validFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      if (Object.keys(filteredUpdates).length === 0) {
        res.status(400).json({
          error: 'No valid fields to update',
          error_fr: 'Aucun champ valide à mettre à jour',
          error_mg: 'Tsy misy saha azo avaozina'
        });
        return;
      }

      // Validate phone number if provided
      if (filteredUpdates.contactPhone) {
        const phoneRegex = /^\\+261[0-9]{9}$/;
        if (!phoneRegex.test(filteredUpdates.contactPhone)) {
          res.status(400).json({
            error: 'Invalid phone number format. Must be +261XXXXXXXXX',
            error_fr: 'Format de numéro de téléphone invalide. Doit être +261XXXXXXXXX',
            error_mg: 'Endrika laharan-telefaona tsy mety. Tokony ho +261XXXXXXXXX'
          });
          return;
        }
      }

      await transaction(async (client) => {
        // Build dynamic update query
        const setClause = Object.keys(filteredUpdates).map((key, index) => {
          const dbField = this.camelToSnake(key);
          return `${dbField} = $${index + 1}`;
        }).join(', ');

        const queryText = `UPDATE business_profiles SET ${setClause} WHERE business_id = $${Object.keys(filteredUpdates).length + 1} AND user_id = $${Object.keys(filteredUpdates).length + 2}`;
        const queryParams = [...Object.values(filteredUpdates), id, userId];

        await client.query(queryText, queryParams);
      });

      res.status(200).json({
        message: 'Business profile updated successfully',
        message_fr: 'Profil d\'entreprise mis à jour avec succès',
        message_mg: 'Tafavoaka soa aman-tsara ny fanavaozana ny mombamomba ny orinasa'
      });
    } catch (error) {
      console.error('Error updating business profile:', error);
      res.status(500).json({
        error: 'Failed to update business profile',
        error_fr: 'Échec de la mise à jour du profil d\'entreprise',
        error_mg: 'Tsy nahomby ny fanavaozana ny mombamomba ny orinasa'
      });
    }
  };

  // Helper methods
  private async getBusinessProfileFromDb(id: string): Promise<BusinessProfile | null> {
    try {
      const result = await query(`
        SELECT 
          business_id, user_id, name_fr, name_mg, name_en,
          description_fr, description_mg, description_en,
          business_type, region, registration_number,
          contact_phone, contact_email, website_url,
          is_verified, verification_status, export_interests,
          currency, created_at, updated_at
        FROM business_profiles
        WHERE business_id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatBusinessProfile(result.rows[0]);
    } catch (error) {
      console.error('Get business profile from DB error:', error);
      return null;
    }
  }

  private async getBusinessProfileByUserId(userId: string): Promise<BusinessProfile | null> {
    try {
      const result = await query(`
        SELECT 
          business_id, user_id, name_fr, name_mg, name_en,
          description_fr, description_mg, description_en,
          business_type, region, registration_number,
          contact_phone, contact_email, website_url,
          is_verified, verification_status, export_interests,
          currency, created_at, updated_at
        FROM business_profiles
        WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatBusinessProfile(result.rows[0]);
    } catch (error) {
      console.error('Get business profile by user ID error:', error);
      return null;
    }
  }

  private formatBusinessProfile(row: any): BusinessProfile {
    return {
      id: row.business_id,
      userId: row.user_id,
      nameFr: row.name_fr,
      nameMg: row.name_mg,
      nameEn: row.name_en,
      descriptionFr: row.description_fr,
      descriptionMg: row.description_mg,
      descriptionEn: row.description_en,
      businessType: row.business_type,
      region: row.region,
      registrationNumber: row.registration_number,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      websiteUrl: row.website_url,
      verified: row.is_verified,
      verificationStatus: row.verification_status,
      exportInterests: row.export_interests || {},
      currency: row.currency,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Create contact request to a business
   */
  public createContactRequest = async (req: BusinessAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Business ID is required',
          error_fr: 'ID d\'entreprise requis',
          error_mg: 'Ilaina ny ID orinasa'
        });
        return;
      }

      const { message } = req.body;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          error_fr: 'Authentification requise',
          error_mg: 'Ilaina ny fanamarinana'
        });
        return;
      }

      // Get target business profile
      const targetProfile = await this.getBusinessProfileFromDb(id);
      if (!targetProfile) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      // Create contact request record
      await query(`
        INSERT INTO contact_requests (
          id, sender_user_id, recipient_user_id, target_business_id, message, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [uuidv4(), user.uid, targetProfile.userId, id, message]);

      res.status(201).json({
        message: 'Contact request sent successfully',
        message_fr: 'Demande de contact envoyée avec succès',
        message_mg: 'Nalefa soa aman-tsara ny fangatahana fifandraisana'
      });

    } catch (error) {
      console.error('Create contact request error:', error);
      res.status(500).json({
        error: 'Failed to send contact request',
        error_fr: 'Échec de l\'envoi de la demande de contact',
        error_mg: 'Tsy nahomby ny fandefasana fangatahana fifandraisana'
      });
    }
  };

  /**
   * Record business profile view
   */
  public recordProfileView = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Business ID is required',
          error_fr: 'ID d\'entreprise requis',
          error_mg: 'Ilaina ny ID orinasa'
        });
        return;
      }

      const viewerId = (req as any).user?.uid || null;

      // Validate business exists
      const businessExists = await this.getBusinessProfileFromDb(id);
      if (!businessExists) {
        res.status(404).json({
          error: 'Business profile not found',
          error_fr: 'Profil d\'entreprise non trouvé',
          error_mg: 'Tsy hita ny mombamomba ny orinasa'
        });
        return;
      }

      // Record view
      await query(`
        INSERT INTO profile_views (
          id, business_id, viewer_user_id, viewed_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [uuidv4(), id, viewerId]);

      res.status(201).json({
        message: 'Profile view recorded',
        message_fr: 'Vue du profil enregistrée',
        message_mg: 'Voaray ny fijerena ny mombamomba'
      });

    } catch (error) {
      console.error('Record profile view error:', error);
      res.status(500).json({
        error: 'Failed to record profile view',
        error_fr: 'Échec de l\'enregistrement de la vue du profil',
        error_mg: 'Tsy voaray ny fijerena ny mombamomba'
      });
    }
  }
}