// apps/api/src/config/database.ts
import { Pool, PoolClient } from 'pg';
import { config } from '../config/environment';

class DatabaseManager {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.createPool();
  }

  private createPool(): void {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      min: config.database.pool.min,
      max: config.database.pool.max,
      connectionTimeoutMillis: config.database.pool.acquireTimeoutMillis,
      idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
      query_timeout: 30000,
      application_name: 'miharina-api',
    });

    this.pool.on('connect', () => console.log(' New database client connected'));
    this.pool.on('error', (err) => {
      console.error(' Database pool error:', err);
      this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    if (!this.pool) throw new Error('Database pool not initialized');

    try {
      const client = await this.pool.connect();
      await this.verifyDatabaseSetup(client);
      client.release();
      this.isConnected = true;

      console.log(' Connected to PostgreSQL database');
      console.log(` Database: ${config.database.name}`);
      console.log(` Host: ${config.database.host}:${config.database.port}`);
    } catch (error) {
      console.error(' Database connection failed:', error);
      throw error;
    }
  }

  private async verifyDatabaseSetup(client: PoolClient): Promise<void> {
    try {
      // Check database version
      const versionResult = await client.query('SELECT version()');
      console.log(' PostgreSQL version:', versionResult.rows[0].version.split(' ')[1]);

      // Ensure required extensions
      await this.ensureExtensions(client);

      // Verify Miharina tables exist
      await this.verifyTables(client);

    } catch (error) {
      console.error(' Database setup verification failed:', error);
      throw error;
    }
  }

  private async ensureExtensions(client: PoolClient): Promise<void> {
    const extensions = ['uuid-ossp', 'pg_trgm', 'unaccent'];

    for (const extension of extensions) {
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
        console.log(` Extension ${extension} available`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`  Extension ${extension} failed:`, errorMessage);
      }
    }
  }

  // UPDATED: Verify all tables from your schema exist
  private async verifyTables(client: PoolClient): Promise<void> {
    const requiredTables = [
      'users', 'business_profiles', 'opportunities',
      'matches', 'messages', 'success_stories'
    ];

    for (const table of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);

      if (!result.rows[0].exists) {
        console.warn(`  Table '${table}' does not exist`);
      } else {
        console.log(` Table '${table}' verified`);
      }
    }
  }

  public async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (config.nodeEnv === 'development' && duration > 100) {
        console.log(` Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(' Query error:', errorMessage);
      console.error(' Query:', text);
      console.error(' Params:', params);
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.pool) {
        return { healthy: false, details: { error: 'Pool not initialized' } };
      }

      const start = Date.now();
      const result = await this.pool.query('SELECT 1 as health_check, NOW() as timestamp');
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        details: {
          connected: this.isConnected,
          responseTime,
          timestamp: result.rows[0].timestamp,
          pool: {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { healthy: false, details: { error: errorMessage } };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log(' Database connection closed');
    }
  }
}

const dbManager = new DatabaseManager();

export const connectDatabase = () => dbManager.connect();
export const query = <T = any>(text: string, params?: any[]) => dbManager.query<T>(text, params);
export const getClient = () => dbManager.getClient();
export const transaction = <T>(callback: (client: PoolClient) => Promise<T>) =>
  dbManager.transaction(callback);
export const healthCheck = () => dbManager.healthCheck();
export const closeDatabase = () => dbManager.close();
export { dbManager };

// UPDATED: Madagascar-specific database utilities matching your schema
export const dbUtils = {
  escapeString: (str: string): string => str.replace(/'/g, "''"),

  // Build multilingual search for your schema fields
  buildMultilingualSearch: (searchTerm: string, tablePrefix = ''): string => {
    const escapedTerm = searchTerm.replace(/[%_]/g, '\\$&');
    const prefix = tablePrefix ? `${tablePrefix}.` : '';

    return `(
      ${prefix}name_fr ILIKE '%${escapedTerm}%' OR
      ${prefix}name_mg ILIKE '%${escapedTerm}%' OR  
      ${prefix}name_en ILIKE '%${escapedTerm}%' OR
      ${prefix}description_fr ILIKE '%${escapedTerm}%' OR
      ${prefix}description_mg ILIKE '%${escapedTerm}%' OR
      ${prefix}description_en ILIKE '%${escapedTerm}%'
    )`;
  },

  // Filter by Madagascar regions from your schema
  buildRegionFilter: (regions: string[]): string => {
    if (regions.length === 0) return '1=1';
    const validRegions = regions.filter(r =>
      ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'].includes(r)
    );
    if (validRegions.length === 0) return '1=1';
    return `region IN (${validRegions.map(r => `'${r}'`).join(', ')})`;
  },

  // Filter by business types from your schema
  buildBusinessTypeFilter: (types: string[]): string => {
    if (types.length === 0) return '1=1';
    const validTypes = types.filter(t =>
      ['agricultural', 'artisan', 'digital_services', 'manufacturing'].includes(t)
    );
    if (validTypes.length === 0) return '1=1';
    return `business_type IN (${validTypes.map(t => `'${t}'`).join(', ')})`;
  },

  // Validate Madagascar phone number
  isValidMadagascarPhone: (phone: string): boolean => {
    return /^\+261[0-9]{9}$/.test(phone);
  },

  // Build JSONB query for export interests/target countries
  buildJsonbContainsQuery: (field: string, value: string): string => {
    return `${field} @> '"${value}"'`;
  },

  // Build full-text search using your GIN indexes
  buildFullTextSearch: (searchTerm: string, language: 'fr' | 'mg' | 'en' = 'fr'): string => {
    const config_map = { fr: 'french', mg: 'simple', en: 'english' };
    return `to_tsvector('${config_map[language]}', name_${language} || ' ' || description_${language}) @@ plainto_tsquery('${config_map[language]}', '${searchTerm}')`;
  }
};