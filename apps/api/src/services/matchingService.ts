import { transaction } from '../config/database';

interface MatchCriteria {
  businessType?: string;
  region?: string;
  investmentRange?: {
    min: number;
    max: number;
  };
  sectors?: string[];
  languages?: string[];
}

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  region: string;
  sectors: string[];
  investment_capacity: {
    min: number;
    max: number;
  };
  languages: string[];
  description: string;
  contact_email: string;
  phone: string;
  website?: string;
  logo_url?: string;
  created_at: Date;
  updated_at: Date;
}

interface MatchResult {
  id: string;
  businessProfile: BusinessProfile;
  score: number;
  reasons: string[];
  matchedCriteria: string[];
}

export class MatchingService {
  private static instance: MatchingService;

  public static getInstance(): MatchingService {
    if (!MatchingService.instance) {
      MatchingService.instance = new MatchingService();
    }
    return MatchingService.instance;
  }

  public async findMatches(businessId: string, criteria?: MatchCriteria): Promise<MatchResult[]> {
    try {
      return await transaction(async (client) => {
        // Get the source business profile
        const sourceBusiness = await this.getBusinessProfile(client, businessId);
        if (!sourceBusiness) {
          throw new Error('Business profile not found');
        }

        // Get potential matches based on criteria
        const potentialMatches = await this.getPotentialMatches(client, businessId, criteria);

        // Calculate match scores
        const matches = this.calculateMatchScores(sourceBusiness, potentialMatches);

        // Sort by score and return top matches
        return matches.sort((a, b) => b.score - a.score).slice(0, 10);
      });
    } catch (error: any) {
      console.error('❌ Matching error:', error);
      throw new Error(`Failed to find matches: ${error.message}`);
    }
  }

  private async getBusinessProfile(client: any, businessId: string): Promise<BusinessProfile | null> {
    const query = `
      SELECT 
        bp.id,
        bp.business_name,
        bp.business_type,
        bp.region,
        bp.sectors,
        bp.investment_capacity,
        bp.languages,
        bp.description,
        bp.contact_email,
        bp.phone,
        bp.website,
        bp.logo_url,
        bp.created_at,
        bp.updated_at
      FROM business_profiles bp
      WHERE bp.id = $1 AND bp.is_active = true
    `;

    const result = await client.query(query, [businessId]);
    return result.rows[0] || null;
  }

  private async getPotentialMatches(
    client: any,
    excludeId: string,
    criteria?: MatchCriteria
  ): Promise<BusinessProfile[]> {
    let query = `
      SELECT 
        bp.id,
        bp.business_name,
        bp.business_type,
        bp.region,
        bp.sectors,
        bp.investment_capacity,
        bp.languages,
        bp.description,
        bp.contact_email,
        bp.phone,
        bp.website,
        bp.logo_url,
        bp.created_at,
        bp.updated_at
      FROM business_profiles bp
      WHERE bp.id != $1 
        AND bp.is_active = true
    `;

    const params: (string | string[])[] = [excludeId];
    let paramIndex = 1;

    if (criteria?.businessType) {
      paramIndex++;
      query += ` AND bp.business_type = $${paramIndex}`;
      params.push(criteria.businessType);
    }

    if (criteria?.region) {
      paramIndex++;
      query += ` AND bp.region = $${paramIndex}`;
      params.push(criteria.region);
    }

    if (criteria?.sectors && criteria.sectors.length > 0) {
      paramIndex++;
      query += ` AND bp.sectors && $${paramIndex}`;
      params.push(criteria.sectors);
    }

    if (criteria?.languages && criteria.languages.length > 0) {
      paramIndex++;
      query += ` AND bp.languages && $${paramIndex}`;
      params.push(criteria.languages);
    }

    query += ` ORDER BY bp.created_at DESC LIMIT 50`;

    const result = await client.query(query, params);
    return result.rows;
  }

  private calculateMatchScores(
    source: BusinessProfile,
    potentials: BusinessProfile[]
  ): MatchResult[] {
    return potentials.map(target => {
      let score = 0;
      const reasons: string[] = [];
      const matchedCriteria: string[] = [];

      // Business type match
      if (source.business_type === target.business_type) {
        score += 25;
        reasons.push('Same business type');
        matchedCriteria.push('business_type');
      }

      // Region match
      if (source.region === target.region) {
        score += 20;
        reasons.push('Same region');
        matchedCriteria.push('region');
      }

      // Sector overlap
      const sectorOverlap = source.sectors.filter(sector =>
        target.sectors.includes(sector)
      );
      if (sectorOverlap.length > 0) {
        score += sectorOverlap.length * 15;
        reasons.push(`Common sectors: ${sectorOverlap.join(', ')}`);
        matchedCriteria.push('sectors');
      }

      // Language overlap
      const languageOverlap = source.languages.filter(lang =>
        target.languages.includes(lang)
      );
      if (languageOverlap.length > 0) {
        score += languageOverlap.length * 10;
        reasons.push(`Common languages: ${languageOverlap.join(', ')}`);
        matchedCriteria.push('languages');
      }

      // Investment capacity compatibility
      const sourceRange = source.investment_capacity;
      const targetRange = target.investment_capacity;

      if (sourceRange && targetRange) {
        const overlap = Math.max(0, Math.min(sourceRange.max, targetRange.max) - Math.max(sourceRange.min, targetRange.min));
        if (overlap > 0) {
          score += 15;
          reasons.push('Compatible investment ranges');
          matchedCriteria.push('investment_capacity');
        }
      }

      // Recency bonus (newer profiles get slight boost)
      const daysSinceCreation = Math.floor((Date.now() - new Date(target.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreation < 30) {
        score += 5;
        reasons.push('Recently created profile');
      }

      return {
        id: target.id,
        businessProfile: target,
        score: Math.min(score, 100),
        reasons,
        matchedCriteria
      };
    });
  }

  public async saveMatch(sourceId: string, targetId: string, score: number): Promise<string> {
    try {
      return await transaction(async (client) => {
        const queryText = `
          INSERT INTO matches (source_business_id, target_business_id, match_score, status, created_at)
          VALUES ($1, $2, $3, 'pending', NOW())
          ON CONFLICT (source_business_id, target_business_id) 
          DO UPDATE SET match_score = $3, updated_at = NOW()
          RETURNING id
        `;

        const result = await client.query(queryText, [sourceId, targetId, score]);
        return result.rows[0].id;
      });
    } catch (error: any) {
      console.error('❌ Save match error:', error);
      throw new Error(`Failed to save match: ${error.message}`);
    }
  }

  public async getMatchHistory(businessId: string): Promise<any[]> {
    try {
      return await transaction(async (client) => {
        const queryText = `
          SELECT 
            m.id,
            m.source_business_id,
            m.target_business_id,
            m.match_score,
            m.status,
            m.created_at,
            m.updated_at,
            bp.business_name as target_business_name,
            bp.business_type as target_business_type,
            bp.region as target_region
          FROM matches m
          JOIN business_profiles bp ON m.target_business_id = bp.id
          WHERE m.source_business_id = $1 OR m.target_business_id = $1
          ORDER BY m.created_at DESC
        `;

        const result = await client.query(queryText, [businessId]);
        return result.rows;
      });
    } catch (error: any) {
      console.error('❌ Get match history error:', error);
      throw new Error(`Failed to get match history: ${error.message}`);
    }
  }
}
