// packages/shared/types/index.ts

// User Types
export interface User {
  id: string;
  email?: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: 'fr' | 'mg' | 'en';
  isVerified: boolean;
  role: 'entrepreneur' | 'admin' | 'partner';
  createdAt: Date;
  updatedAt: Date;
}

// Business Profile Types
export interface BusinessProfile {
  id: string;
  userId: string;
  nameFr: string;
  nameMg?: string;
  nameEn?: string;
  descriptionFr: string;
  descriptionMg?: string;
  descriptionEn?: string;
  businessType: BusinessType;
  region: MadagascarRegion;
  registrationNumber?: string;
  contactPhone: string;
  contactEmail?: string;
  websiteUrl?: string;
  logoUrl?: string;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  exportInterests?: ExportInterest[];
  currency: 'MGA' | 'USD' | 'EUR';
  createdAt: Date;
  updatedAt: Date;
}

export type BusinessType = 
  | 'agricultural' 
  | 'artisan' 
  | 'digital_services' 
  | 'manufacturing' 
  | 'retail' 
  | 'tourism' 
  | 'food_processing' 
  | 'textile';

export type MadagascarRegion = 
  | 'Antananarivo' 
  | 'Fianarantsoa' 
  | 'Toamasina' 
  | 'Mahajanga' 
  | 'Toliara' 
  | 'Antsiranana';

export interface ExportInterest {
  targetCountries: string[];
  products: string[];
  sectors: string[];
}

// Opportunity Types
export interface Opportunity {
  id: string;
  titleFr: string;
  titleMg?: string;
  titleEn?: string;
  descriptionFr: string;
  descriptionMg?: string;
  descriptionEn?: string;
  type: OpportunityType;
  category: string;
  location: string;
  requirements: string[];
  benefits: string[];
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  deadline?: Date;
  status: 'active' | 'expired' | 'closed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityType = 
  | 'partnership' 
  | 'investment' 
  | 'mentorship' 
  | 'export' 
  | 'import' 
  | 'joint_venture' 
  | 'collaboration';

// Matching Types
export interface Match {
  id: string;
  businessId1: string;
  businessId2: string;
  score: number;
  reasons: string[];
  recommendations: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface MatchCriteria {
  businessType?: BusinessType[];
  region?: MadagascarRegion[];
  exportInterests?: string[];
  minScore?: number;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'file' | 'system';
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search Types
export interface SearchFilters {
  query?: string;
  businessType?: BusinessType[];
  region?: MadagascarRegion[];
  verified?: boolean;
  minScore?: number;
  sortBy?: 'relevance' | 'newest' | 'oldest' | 'score';
}

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'match' | 'message' | 'opportunity' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
}

// Analytics Types
export interface AnalyticsData {
  totalUsers: number;
  totalBusinesses: number;
  totalOpportunities: number;
  totalMatches: number;
  activeUsers: number;
  newUsersToday: number;
  popularRegions: Array<{
    region: MadagascarRegion;
    count: number;
  }>;
  popularBusinessTypes: Array<{
    type: BusinessType;
    count: number;
  }>;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Form Types
export interface BusinessProfileForm {
  nameFr: string;
  nameMg?: string;
  nameEn?: string;
  descriptionFr: string;
  descriptionMg?: string;
  descriptionEn?: string;
  businessType: BusinessType;
  region: MadagascarRegion;
  registrationNumber?: string;
  contactPhone: string;
  contactEmail?: string;
  websiteUrl?: string;
  exportInterests?: ExportInterest;
}

export interface OpportunityForm {
  titleFr: string;
  titleMg?: string;
  titleEn?: string;
  descriptionFr: string;
  descriptionMg?: string;
  descriptionEn?: string;
  type: OpportunityType;
  category: string;
  location: string;
  requirements: string[];
  benefits: string[];
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  deadline?: string;
}

// Auth Types
export interface AuthUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  customClaims?: {
    role?: string;
    businessId?: string;
  };
}

export interface LoginCredentials {
  email?: string;
  phoneNumber?: string;
  password?: string;
  otp?: string;
}

export interface RegisterData {
  email?: string;
  phoneNumber: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: 'fr' | 'mg' | 'en';
}

// Pagination Types
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Cache Types
export interface CacheOptions {
  key: string;
  ttl?: number; // Time to live in seconds
  tags?: string[];
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature: string;
}
