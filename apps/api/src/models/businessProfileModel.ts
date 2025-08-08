export interface BusinessProfile {
  id?: string;
  userId: string;
  nameFr: string; // French name
  nameMg?: string; // Malagasy name
  nameEn?: string; // English name
  descriptionFr: string; // French description
  descriptionMg?: string; // Malagasy description
  descriptionEn?: string; // English description
  businessType: 'agricultural' | 'artisan' | 'digital_services' | 'manufacturing';
  region: 'antananarivo' | 'fianarantsoa' | 'toamasina' | 'mahajanga' | 'toliara' | 'antsiranana';
  exportInterests?: string[]; // Target countries or products for export
  contactInfo: {
    phone: string;
    email: string;
    addressFr: string; // French address
    addressMg?: string; // Malagasy address
    addressEn?: string; // English address
  };
  profileImageUrl?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID of creator
}

export const defaultBusinessProfile: Partial<BusinessProfile> = {
  verified: false,
  exportInterests: [],
};
