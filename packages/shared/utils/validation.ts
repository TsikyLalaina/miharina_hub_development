// packages/shared/utils/validation.ts

import { PHONE_NUMBER_FORMAT } from '../constants/madagascar';

export const ValidationUtils = {
  // Phone number validation for Madagascar
  isValidMalagasyPhone: (phone: string): boolean => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return PHONE_NUMBER_FORMAT.pattern.test(cleanPhone);
  },

  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // URL validation
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Business registration number validation (Malagasy format)
  isValidRegistrationNumber: (regNumber: string): boolean => {
    // Malagasy business registration format: typically starts with NIF or STAT
    const regRegex = /^(NIF|STAT|RCS)-?[0-9]{6,}$/i;
    return regRegex.test(regNumber);
  },

  // File size validation
  isValidFileSize: (size: number, maxSize: number): boolean => {
    return size <= maxSize;
  },

  // File type validation
  isValidFileType: (mimeType: string, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(mimeType);
  },

  // Password strength validation
  isValidPassword: (password: string): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export const SanitizationUtils = {
  // Sanitize phone number
  sanitizePhone: (phone: string): string => {
    return phone.replace(/\s+/g, '').replace(/[^+0-9]/g, '');
  },

  // Sanitize email
  sanitizeEmail: (email: string): string => {
    return email.trim().toLowerCase();
  },

  // Sanitize URL
  sanitizeUrl: (url: string): string => {
    return url.trim();
  },

  // Sanitize text input
  sanitizeText: (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  },

  // Sanitize HTML content
  sanitizeHtml: (html: string): string => {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }
};

export const FormatUtils = {
  // Format phone number for display
  formatPhone: (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('261')) {
      return `+${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6, 9)} ${cleanPhone.slice(9)}`;
    }
    return phone;
  },

  // Format currency
  formatCurrency: (amount: number, currency: string = 'MGA'): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'MGA' ? 0 : 2
    }).format(amount);
  },

  // Format date
  formatDate: (date: Date, locale: string = 'fr'): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

export const BusinessValidation = {
  // Validate business profile data
  validateBusinessProfile: (data: any): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};
    
    if (!data.nameFr || data.nameFr.trim().length < 3) {
      errors.nameFr = 'Business name (French) is required and must be at least 3 characters';
    }
    
    if (!data.descriptionFr || data.descriptionFr.trim().length < 10) {
      errors.descriptionFr = 'Business description (French) is required and must be at least 10 characters';
    }
    
    if (!data.businessType) {
      errors.businessType = 'Business type is required';
    }
    
    if (!data.region) {
      errors.region = 'Region is required';
    }
    
    if (!data.contactPhone || !ValidationUtils.isValidMalagasyPhone(data.contactPhone)) {
      errors.contactPhone = 'Valid Malagasy phone number is required';
    }
    
    if (data.contactEmail && !ValidationUtils.isValidEmail(data.contactEmail)) {
      errors.contactEmail = 'Valid email address is required';
    }
    
    if (data.websiteUrl && !ValidationUtils.isValidUrl(data.websiteUrl)) {
      errors.websiteUrl = 'Valid website URL is required';
    }
    
    if (data.registrationNumber && !ValidationUtils.isValidRegistrationNumber(data.registrationNumber)) {
      errors.registrationNumber = 'Valid registration number format is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Validate opportunity data
  validateOpportunity: (data: any): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};
    
    if (!data.titleFr || data.titleFr.trim().length < 5) {
      errors.titleFr = 'Title (French) is required and must be at least 5 characters';
    }
    
    if (!data.descriptionFr || data.descriptionFr.trim().length < 20) {
      errors.descriptionFr = 'Description (French) is required and must be at least 20 characters';
    }
    
    if (!data.type) {
      errors.type = 'Opportunity type is required';
    }
    
    if (!data.category) {
      errors.category = 'Category is required';
    }
    
    if (!data.location) {
      errors.location = 'Location is required';
    }
    
    if (data.deadline && new Date(data.deadline) <= new Date()) {
      errors.deadline = 'Deadline must be in the future';
    }
    
    if (data.budgetMin && data.budgetMax && data.budgetMin > data.budgetMax) {
      errors.budget = 'Minimum budget must be less than maximum budget';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};
