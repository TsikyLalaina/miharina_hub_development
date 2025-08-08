// apps/api/src/config/firebase.ts
import * as admin from 'firebase-admin';
import { config } from './environment';

export interface MadagascarUserClaims {
  businessType: 'agricultural' | 'artisan' | 'digital_services' | 'manufacturing';
  // Fixed: Match database regions exactly (capitalized)
  region: 'Antananarivo' | 'Fianarantsoa' | 'Toamasina' | 'Mahajanga' | 'Toliara' | 'Antsiranana';
  verified: boolean;
  country: 'madagascar';
  role: 'entrepreneur' | 'admin' | 'partner';
  createdAt: number;
  lastLogin: number;
}

export interface FirebaseUser extends admin.auth.UserRecord {
  customClaims?: MadagascarUserClaims;
}

class FirebaseManager {
  private app: admin.app.App | null = null;
  private auth: admin.auth.Auth | null = null;

  public async initialize(): Promise<void> {
    if (this.app) {
      console.log('✅ Firebase already initialized');
      return;
    }

    try {
      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
        projectId: config.firebase.projectId,
      });

      this.auth = this.app.auth();

      // Verify initialization
      await this.verifyConnection();

      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log(`🔥 Project: ${config.firebase.projectId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Firebase initialization failed:', errorMessage);
      throw error;
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      if (!this.auth) {
        throw new Error('Firebase Auth not initialized');
      }

      // Test connection by fetching user count (limit 1)
      await this.auth.listUsers(1);
      console.log('🔐 Firebase Auth connection verified');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Firebase verification failed:', errorMessage);
      throw error;
    }
  }

  public getAuth(): admin.auth.Auth {
    if (!this.auth) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  public getApp(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.app;
  }

  // User management methods
  public async createUser(userData: {
    phoneNumber?: string;
    email?: string;
    password?: string;
    displayName?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    const auth = this.getAuth();

    try {
      const userRecord = await auth.createUser({
        ...(userData.phoneNumber && { phoneNumber: userData.phoneNumber }),
        ...(userData.email && { email: userData.email }),
        ...(userData.password && { password: userData.password }),
        displayName: userData.displayName || null,
        disabled: userData.disabled || false,
      });

      console.log(`👤 Created user: ${userRecord.uid}`);
      return userRecord;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to create user:', errorMessage);
      throw error;
    }
  }

  public async getUserByPhone(phoneNumber: string): Promise<admin.auth.UserRecord | null> {
    const auth = this.getAuth();

    try {
      const userRecord = await auth.getUserByPhoneNumber(phoneNumber);
      return userRecord;
    } catch (error) {
      // Type guard for Firebase auth errors
      const firebaseError = error as admin.FirebaseError;
      if (firebaseError.code === 'auth/user-not-found') {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to get user by phone:', errorMessage);
      throw error;
    }
  }

  public async getUserById(uid: string): Promise<admin.auth.UserRecord | null> {
    const auth = this.getAuth();

    try {
      const userRecord = await auth.getUser(uid);
      return userRecord;
    } catch (error) {
      // Type guard for Firebase auth errors
      const firebaseError = error as admin.FirebaseError;
      if (firebaseError.code === 'auth/user-not-found') {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to get user by ID:', errorMessage);
      throw error;
    }
  }

  // Custom claims management for Madagascar businesses
  public async setCustomClaims(uid: string, claims: Partial<MadagascarUserClaims>): Promise<void> {
    const auth = this.getAuth();

    try {
      // Validate claims
      this.validateClaims(claims);

      // Set timestamp
      const claimsWithTimestamp = {
        ...claims,
        lastLogin: Date.now(),
      };

      await auth.setCustomUserClaims(uid, claimsWithTimestamp);
      console.log(`🏷️  Set custom claims for user: ${uid}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to set custom claims:', errorMessage);
      throw error;
    }
  }

  public async updateCustomClaims(uid: string, updates: Partial<MadagascarUserClaims>): Promise<void> {
    const auth = this.getAuth();

    try {
      // Get current user and claims
      const user = await auth.getUser(uid);
      const currentClaims = (user.customClaims as MadagascarUserClaims) || {};

      // Merge with updates
      const newClaims = {
        ...currentClaims,
        ...updates,
        lastLogin: Date.now(),
      };

      this.validateClaims(newClaims);
      await auth.setCustomUserClaims(uid, newClaims);

      console.log(`🔄 Updated custom claims for user: ${uid}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to update custom claims:', errorMessage);
      throw error;
    }
  }

  public async updateUser(uid: string, updates: {
    displayName?: string;
    phoneNumber?: string;
    email?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    const auth = this.getAuth();

    try {
      const userRecord = await auth.updateUser(uid, {
        ...(updates.displayName && { displayName: updates.displayName }),
        ...(updates.phoneNumber && { phoneNumber: updates.phoneNumber }),
        ...(updates.email && { email: updates.email }),
        ...(updates.disabled !== undefined && { disabled: updates.disabled }),
      });

      console.log(`👤 Updated user: ${uid}`);
      return userRecord;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to update user:', errorMessage);
      throw error;
    }
  }

  public async deleteUser(uid: string): Promise<void> {
    const auth = this.getAuth();

    try {
      await auth.deleteUser(uid);
      console.log(`🗑️  Deleted user: ${uid}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to delete user:', errorMessage);
      throw error;
    }
  }

  private validateClaims(claims: Partial<MadagascarUserClaims>): void {
    // Fixed: Use proper database values for validation
    const validBusinessTypes = ['agricultural', 'artisan', 'digital_services', 'manufacturing'];
    const validRegions = ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'];

    if (claims.businessType && !validBusinessTypes.includes(claims.businessType)) {
      throw new Error(`Invalid business type: ${claims.businessType}`);
    }

    if (claims.region && !validRegions.includes(claims.region)) {
      throw new Error(`Invalid region: ${claims.region}`);
    }

    if (claims.role && !['entrepreneur', 'admin', 'partner'].includes(claims.role)) {
      throw new Error(`Invalid role: ${claims.role}`);
    }
  }

  // Token verification
  public async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    const auth = this.getAuth();

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Token verification failed:', errorMessage);
      throw error;
    }
  }

  // Business verification workflow
  public async verifyBusiness(uid: string): Promise<void> {
    await this.updateCustomClaims(uid, { verified: true });
    console.log(`✅ Business verified for user: ${uid}`);
  }

  public async unverifyBusiness(uid: string): Promise<void> {
    await this.updateCustomClaims(uid, { verified: false });
    console.log(`❌ Business unverified for user: ${uid}`);
  }

  // User search and listing
  public async listUsers(maxResults: number = 1000): Promise<admin.auth.UserRecord[]> {
    const auth = this.getAuth();

    try {
      const usersList = await auth.listUsers(maxResults);
      return usersList.users;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to list users:', errorMessage);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      if (!this.auth || !this.app) {
        return { healthy: false, details: { error: 'Firebase not initialized' } };
      }

      // Test auth connection
      const start = Date.now();
      await this.auth.listUsers(1);
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        details: {
          projectId: config.firebase.projectId,
          responseTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        healthy: false,
        details: { error: errorMessage },
      };
    }
  }
}

// Singleton instance
const firebaseManager = new FirebaseManager();

// Export convenience functions
export const initializeFirebase = () => firebaseManager.initialize();
export const getFirebaseAuth = () => firebaseManager.getAuth();
export const getFirebaseApp = () => firebaseManager.getApp();
export const verifyToken = (idToken: string) => firebaseManager.verifyToken(idToken);
export const createUser = (userData: any) => firebaseManager.createUser(userData);
export const getUserByPhone = (phoneNumber: string) => firebaseManager.getUserByPhone(phoneNumber);
export const getUserById = (uid: string) => firebaseManager.getUserById(uid);
export const setCustomClaims = (uid: string, claims: Partial<MadagascarUserClaims>) =>
  firebaseManager.setCustomClaims(uid, claims);
export const updateCustomClaims = (uid: string, updates: Partial<MadagascarUserClaims>) =>
  firebaseManager.updateCustomClaims(uid, updates);
export const verifyBusiness = (uid: string) => firebaseManager.verifyBusiness(uid);
export const unverifyBusiness = (uid: string) => firebaseManager.unverifyBusiness(uid);
export const listUsers = (maxResults?: number) => firebaseManager.listUsers(maxResults);
export const deleteUser = (uid: string) => firebaseManager.deleteUser(uid);
export const firebaseHealthCheck = () => firebaseManager.healthCheck();

// Export firebase manager for advanced usage
export { firebaseManager };

// Utility functions for Madagascar-specific operations
export const firebaseUtils = {
  // Generate business profile claims for new user
  generateBusinessClaims: (
    businessType: MadagascarUserClaims['businessType'],
    region: MadagascarUserClaims['region']
  ): MadagascarUserClaims => ({
    businessType,
    region,
    verified: false,
    country: 'madagascar',
    role: 'entrepreneur',
    createdAt: Date.now(),
    lastLogin: Date.now(),
  }),

  // Validate Madagascar phone number - Fixed regex to match database constraint
  validateMadagascarPhone: (phoneNumber: string): boolean => {
    const phoneRegex = /^\+261[0-9]{9}$/;
    return phoneRegex.test(phoneNumber);
  },

  // Format phone number for Firebase
  formatPhoneNumber: (phoneNumber: string): string => {
    // Remove any spaces, hyphens, or other formatting
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Add +261 if not present
    if (cleaned.startsWith('261')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+261')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      // Convert local format (032...) to international (+261...)
      return `+261${cleaned.substring(1)}`;
    } else {
      // Assume it's a local number without leading 0
      return `+261${cleaned}`;
    }
  },

  // Check if user has required claims for business operations
  hasBusinessClaims: (user: admin.auth.UserRecord): boolean => {
    const claims = user.customClaims as MadagascarUserClaims;
    return !!(claims?.businessType && claims?.region && claims?.country === 'madagascar');
  },

  // Check if business is verified
  isBusinessVerified: (user: admin.auth.UserRecord): boolean => {
    const claims = user.customClaims as MadagascarUserClaims;
    return claims?.verified === true;
  },

  // Get user's business region
  getUserRegion: (user: admin.auth.UserRecord): string | null => {
    const claims = user.customClaims as MadagascarUserClaims;
    return claims?.region || null;
  },

  // Get user's business type
  getUserBusinessType: (user: admin.auth.UserRecord): string | null => {
    const claims = user.customClaims as MadagascarUserClaims;
    return claims?.businessType || null;
  },
};