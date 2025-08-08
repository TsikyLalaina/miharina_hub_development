import { Request } from 'express';

export type SupportedLanguage = 'fr' | 'mg' | 'en';

export interface User {
  uid: string;  // Firebase UID - primary identifier from Firebase Auth
  id?: string;  // Database ID - optional for compatibility
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  country?: string;
  firebase_uid?: string;  // Keep for backward compatibility
  created_at?: Date;
  updated_at?: Date;
  customClaims?: any;  // Firebase custom claims
}

export interface BusinessProfile {
  business_id: string;
  user_id: string;
  name_fr: string;
  name_mg?: string;
  name_en?: string;
  description_fr: string;
  description_mg?: string;
  description_en?: string;
  business_type: string;
  region: string;
  registration_number?: string;
  contact_phone?: string;
  contact_email?: string;
  website_url?: string;
  currency?: string;
  export_interests?: any;
  is_verified: boolean;
  verification_status: string;
  created_at?: Date;
  updated_at?: Date;
}

// Extend Express Request with user property
export interface AuthenticatedRequest extends Request {
  user: User;
  userLanguage?: SupportedLanguage;
}

// Extend AuthenticatedRequest with businessProfile property
export interface BusinessAuthenticatedRequest extends AuthenticatedRequest {
  businessProfile: BusinessProfile;
}

// Module augmentation to extend Express globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
      businessProfile?: BusinessProfile;
      userLanguage?: SupportedLanguage;
    }
  }
}
