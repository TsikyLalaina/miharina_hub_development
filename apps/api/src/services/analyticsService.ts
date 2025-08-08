import { getClient } from '../config/database';

interface AnalyticsData {
  totalUsers: number;
  totalBusinesses: number;
  totalOpportunities: number;
  totalMatches: number;
  activeUsers: number;
  newUsersToday: number;
  newBusinessesToday: number;
  newMatchesToday: number;
}

interface BusinessAnalytics {
  businessId: string;
  views: number;
  matches: number;
  messages: number;
  opportunities: number;
  lastActivity: Date;
}

interface RegionalAnalytics {
  region: string;
  businesses: number;
  opportunities: number;
  matches: number;
  growthRate: number;
}

interface RegionalAnalyticsRow {
  region: string;
  businesses: string;
  opportunities: string;
  matches: string;
  growth_rate: string;
}

interface TimeSeriesData {
  date: string;
  users: number;
  businesses: number;
  matches: number;
  opportunities: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async getDashboardAnalytics(): Promise<AnalyticsData> {
    try {
      const client = await getClient();
      
      try {
        const queries = [
          'SELECT COUNT(*) as count FROM users',
          'SELECT COUNT(*) as count FROM business_profiles WHERE is_active = true',
          'SELECT COUNT(*) as count FROM opportunities WHERE is_active = true',
          'SELECT COUNT(*) as count FROM matches',
          'SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL \'30 days\'',
          'SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'1 day\'',
          'SELECT COUNT(*) as count FROM business_profiles WHERE created_at > NOW() - INTERVAL \'1 day\'',
          'SELECT COUNT(*) as count FROM matches WHERE created_at > NOW() - INTERVAL \'1 day\''
        ];

        const results = await Promise.all(queries.map(query => client.query(query)));

        return {
          totalUsers: parseInt(results[0]?.rows?.[0]?.count || '0'),
          totalBusinesses: parseInt(results[1]?.rows?.[0]?.count || '0'),
          totalOpportunities: parseInt(results[2]?.rows?.[0]?.count || '0'),
          totalMatches: parseInt(results[3]?.rows?.[0]?.count || '0'),
          activeUsers: parseInt(results[4]?.rows?.[0]?.count || '0'),
          newUsersToday: parseInt(results[5]?.rows?.[0]?.count || '0'),
          newBusinessesToday: parseInt(results[6]?.rows?.[0]?.count || '0'),
          newMatchesToday: parseInt(results[7]?.rows?.[0]?.count || '0'),
        };
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Dashboard analytics error:', error);
      throw new Error(`Failed to get dashboard analytics: ${error.message}`);
    }
  }

  public async getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
    try {
      const client = await getClient();
      
      try {
        const queries = [
          'SELECT COUNT(*) as count FROM business_views WHERE business_id = $1',
          'SELECT COUNT(*) as count FROM matches WHERE (source_business_id = $1 OR target_business_id = $1)',
          'SELECT COUNT(*) as count FROM messages WHERE business_id = $1',
          'SELECT COUNT(*) as count FROM opportunities WHERE business_id = $1',
          'SELECT MAX(updated_at) as last_activity FROM business_profiles WHERE id = $1'
        ];

        const results = await Promise.all(queries.map(query => client.query(query, [businessId])));

        return {
          businessId,
          views: parseInt(results[0]?.rows?.[0]?.count || '0'),
          matches: parseInt(results[1]?.rows?.[0]?.count || '0'),
          messages: parseInt(results[2]?.rows?.[0]?.count || '0'),
          opportunities: parseInt(results[3]?.rows?.[0]?.count || '0'),
          lastActivity: results[4]?.rows?.[0]?.last_activity || new Date(),
        };
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Business analytics error:', error);
      throw new Error(`Failed to get business analytics: ${error.message}`);
    }
  }

  public async getRegionalAnalytics(): Promise<RegionalAnalytics[]> {
    try {
      const client = await getClient();
      
      try {
        const query = `
          SELECT 
            region,
            COUNT(*) as businesses,
            COUNT(opportunities.id) as opportunities,
            COUNT(matches.id) as matches,
            0 as growth_rate
          FROM business_profiles bp
          LEFT JOIN opportunities ON bp.id = opportunities.business_id
          LEFT JOIN matches ON bp.id = matches.source_business_id OR bp.id = matches.target_business_id
          WHERE bp.is_active = true
          GROUP BY region
          ORDER BY businesses DESC
        `;

        const result = await client.query(query);
        
        return result.rows.map((row: RegionalAnalyticsRow) => ({
          region: row.region || 'Unknown',
          businesses: parseInt(row.businesses || '0'),
          opportunities: parseInt(row.opportunities || '0'),
          matches: parseInt(row.matches || '0'),
          growthRate: 0, // Placeholder for growth calculation
        }));
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Regional analytics error:', error);
      throw new Error(`Failed to get regional analytics: ${error.message}`);
    }
  }

  public async getTimeSeriesData(days: number = 30): Promise<TimeSeriesData[]> {
    try {
      const client = await getClient();
      
      try {
        const query = `
          SELECT 
            date_trunc('day', generate_series) as date,
            COALESCE(users_data.count, 0) as users,
            COALESCE(businesses_data.count, 0) as businesses,
            COALESCE(matches_data.count, 0) as matches,
            COALESCE(opportunities_data.count, 0) as opportunities
          FROM generate_series(
            NOW() - INTERVAL '${days} days',
            NOW(),
            INTERVAL '1 day'
          ) as generate_series
          LEFT JOIN (
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            GROUP BY DATE(created_at)
          ) users_data ON DATE(generate_series) = users_data.date
          LEFT JOIN (
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM business_profiles
            GROUP BY DATE(created_at)
          ) businesses_data ON DATE(generate_series) = businesses_data.date
          LEFT JOIN (
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM matches
            GROUP BY DATE(created_at)
          ) matches_data ON DATE(generate_series) = matches_data.date
          LEFT JOIN (
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM opportunities
            GROUP BY DATE(created_at)
          ) opportunities_data ON DATE(generate_series) = opportunities_data.date
          ORDER BY date
        `;

        const result = await client.query(query);
        
        return result.rows.map(row => ({
          date: row.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          users: parseInt(row.users || '0'),
          businesses: parseInt(row.businesses || '0'),
          matches: parseInt(row.matches || '0'),
          opportunities: parseInt(row.opportunities || '0'),
        }));
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Time series data error:', error);
      throw new Error(`Failed to get time series data: ${error.message}`);
    }
  }

  public async trackBusinessView(businessId: string, viewerId?: string): Promise<void> {
    try {
      const client = await getClient();
      
      try {
        const query = `
          INSERT INTO business_views (business_id, viewer_id, viewed_at)
          VALUES ($1, $2, NOW())
        `;
        
        await client.query(query, [businessId, viewerId || null]);
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Track business view error:', error);
    }
  }

  public async getPopularBusinesses(limit: number = 10): Promise<any[]> {
    try {
      const client = await getClient();
      
      try {
        const query = `
          SELECT 
            bp.id,
            bp.business_name,
            bp.business_type,
            bp.region,
            COUNT(bv.id) as views,
            COUNT(matches.id) as matches
          FROM business_profiles bp
          LEFT JOIN business_views bv ON bp.id = bv.business_id
          LEFT JOIN matches ON bp.id = matches.source_business_id OR bp.id = matches.target_business_id
          WHERE bp.is_active = true
          GROUP BY bp.id, bp.business_name, bp.business_type, bp.region
          ORDER BY views DESC, matches DESC
          LIMIT $1
        `;

        const result = await client.query(query, [limit]);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Popular businesses error:', error);
      throw new Error(`Failed to get popular businesses: ${error.message}`);
    }
  }

  public async getUserEngagementMetrics(): Promise<any> {
    try {
      const client = await getClient();
      
      try {
        const queries = [
          'SELECT AVG(EXTRACT(EPOCH FROM (last_login_at - created_at))/86400) as avg_days_active FROM users WHERE last_login_at IS NOT NULL',
          'SELECT COUNT(*) as total_messages FROM messages',
          'SELECT COUNT(*) as total_matches FROM matches',
          'SELECT AVG(match_score) as avg_match_score FROM matches'
        ];

        const results = await Promise.all(queries.map(query => client.query(query)));

        return {
          averageDaysActive: parseFloat(results[0]?.rows?.[0]?.avg_days_active || '0') || 0,
          totalMessages: parseInt(results[1]?.rows?.[0]?.total_messages || '0'),
          totalMatches: parseInt(results[2]?.rows?.[0]?.total_matches || '0'),
          averageMatchScore: parseFloat(results[3]?.rows?.[0]?.avg_match_score || '0') || 0,
        };
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ User engagement metrics error:', error);
      throw new Error(`Failed to get user engagement metrics: ${error.message}`);
    }
  }
}
