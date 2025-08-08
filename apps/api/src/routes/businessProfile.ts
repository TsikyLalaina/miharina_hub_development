// apps/api/src/routes/businessProfile.ts
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  authenticateToken,
  requireBusinessProfile,
  requireMadagascarUser,
  requireVerifiedBusiness,
  rateLimitByUser
} from '../middleware/auth';
import { BusinessProfileController } from '../controllers/businessProfileController';


const router = Router();
const controller = new BusinessProfileController();

// Fixed: Use hardcoded values that match database schema
const businessTypes = ['agricultural', 'artisan', 'digital_services', 'manufacturing'];
const regions = ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana'];
const currencies = ['MGA', 'USD', 'EUR'];
const phoneRegex = /^\+261[0-9]{9}$/;

// Validation rules
const createBusinessProfileValidation = [
  // Fixed: Use database column names (name_fr, description_fr)
  body('name_fr')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Business name (French) must be between 2 and 255 characters'),

  body('name_mg')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Business name (Malagasy) must be max 255 characters'),

  body('name_en')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Business name (English) must be max 255 characters'),

  body('description_fr')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description (French) must be between 20 and 5000 characters'),

  body('description_mg')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description (Malagasy) must be max 5000 characters'),

  body('description_en')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description (English) must be max 5000 characters'),

  body('business_type')
    .isIn(businessTypes)
    .withMessage(`Business type must be one of: ${businessTypes.join(', ')}`),

  body('region')
    .isIn(regions)
    .withMessage(`Region must be one of: ${regions.join(', ')}`),

  body('registration_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Registration number must be max 50 characters'),

  body('contact_phone')
    .optional()
    .matches(phoneRegex)
    .withMessage('Phone number must be a valid Madagascar number (+261xxxxxxxxx)'),

  body('contact_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must be valid and max 255 characters'),

  body('website_url')
    .optional()
    .isURL()
    .isLength({ max: 255 })
    .withMessage('Website must be a valid URL and max 255 characters'),

  body('currency')
    .optional()
    .isIn(currencies)
    .withMessage(`Currency must be one of: ${currencies.join(', ')}`),

  // Fixed: Use JSONB field name from schema
  body('export_interests')
    .optional()
    .isObject()
    .withMessage('Export interests must be a JSON object'),

  body('export_interests.countries')
    .optional()
    .isArray()
    .withMessage('Export countries must be an array'),

  body('export_interests.products')
    .optional()
    .isArray()
    .withMessage('Export products must be an array'),
];

const updateBusinessProfileValidation = [
  // Same as create but all fields optional
  body('name_fr')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }),

  body('name_mg')
    .optional()
    .trim()
    .isLength({ max: 255 }),

  body('name_en')
    .optional()
    .trim()
    .isLength({ max: 255 }),

  body('description_fr')
    .optional()
    .trim()
    .isLength({ min: 20, max: 5000 }),

  body('description_mg')
    .optional()
    .trim()
    .isLength({ max: 5000 }),

  body('description_en')
    .optional()
    .trim()
    .isLength({ max: 5000 }),

  body('business_type')
    .optional()
    .isIn(businessTypes),

  body('region')
    .optional()
    .isIn(regions),

  body('registration_number')
    .optional()
    .trim()
    .isLength({ max: 50 }),

  body('contact_phone')
    .optional()
    .matches(phoneRegex),

  body('contact_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 }),

  body('website_url')
    .optional()
    .isURL()
    .isLength({ max: 255 }),

  body('currency')
    .optional()
    .isIn(currencies),

  body('export_interests')
    .optional()
    .isObject(),
];

const searchValidation = [
  query('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('business_type')
    .optional()
    .isIn([...businessTypes, 'all'])
    .withMessage(`Business type must be one of: ${businessTypes.join(', ')}, all`),

  query('region')
    .optional()
    .isIn([...regions, 'all'])
    .withMessage(`Region must be one of: ${regions.join(', ')}, all`),

  query('is_verified')
    .optional()
    .isBoolean()
    .withMessage('is_verified must be true or false'),

  query('verification_status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'all'])
    .withMessage('Verification status must be: pending, approved, rejected, or all'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Middleware to handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      error_fr: 'Échec de la validation',
      error_mg: 'Tsy voamarina ny angon-drakitra',
      details: errors.array(),
    });
    return;
  }
  next();
};

// Rate limiting for different operations - properly typed
const createRateLimit = rateLimitByUser(5, 60 * 60 * 1000) as RequestHandler; // 5 creates per hour
const updateRateLimit = rateLimitByUser(20, 60 * 60 * 1000) as RequestHandler; // 20 updates per hour
const searchRateLimit = rateLimitByUser(100, 60 * 60 * 1000) as RequestHandler; // 100 searches per hour

/**
 * @route POST /api/v1/business-profiles
 * @desc Create a new business profile
 * @access Private (Madagascar users only)
 */
router.post(
  '/',
  authenticateToken as RequestHandler,
  requireMadagascarUser as RequestHandler,
  createRateLimit,
  createBusinessProfileValidation,
  handleValidationErrors,
  controller.createBusinessProfile as RequestHandler
);

/**
 * @route GET /api/v1/business-profiles/me
 * @desc Get current user's business profile
 * @access Private
 */
router.get(
  '/me',
  authenticateToken as RequestHandler,
  requireBusinessProfile as RequestHandler,
  controller.getOwnBusinessProfile as RequestHandler
);

/**
 * @route PUT /api/v1/business-profiles/me
 * @desc Update current user's business profile
 * @access Private
 */
router.put(
  '/me',
  authenticateToken as RequestHandler,
  requireBusinessProfile as RequestHandler,
  updateRateLimit,
  updateBusinessProfileValidation,
  handleValidationErrors,
  controller.updateOwnBusinessProfile as RequestHandler
);

/**
 * @route DELETE /api/v1/business-profiles/me
 * @desc Delete current user's business profile
 * @access Private
 */
router.delete(
  '/me',
  authenticateToken as RequestHandler,
  requireBusinessProfile as RequestHandler,
  controller.deleteOwnBusinessProfile as RequestHandler
);

/**
 * @route GET /api/v1/business-profiles/search
 * @desc Search business profiles
 * @access Public with optional auth
 */
router.get(
  '/search',
  searchRateLimit,
  searchValidation,
  handleValidationErrors,
  controller.searchBusinessProfiles as RequestHandler
);

/**
 * @route GET /api/v1/business-profiles/stats
 * @desc Get business profile statistics
 * @access Public
 */
router.get(
  '/stats',
  controller.getBusinessStats as RequestHandler
);

/**
 * @route GET /api/v1/business-profiles/:id
 * @desc Get business profile by ID
 * @access Public with optional auth
 */
router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid business profile ID'),
  handleValidationErrors,
  controller.getBusinessProfile as RequestHandler
);

/**
 * @route POST /api/v1/business-profiles/:id/contact
 * @desc Request contact information from business
 * @access Private (verified businesses only)
 */
router.post(
  '/:id/contact',
  authenticateToken as RequestHandler,
  requireBusinessProfile as RequestHandler,
  requireVerifiedBusiness as RequestHandler,
  param('id').isUUID().withMessage('Invalid business profile ID'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be between 10 and 500 characters'),
  handleValidationErrors,
  controller.createContactRequest as RequestHandler
);

/**
 * @route POST /api/v1/business-profiles/:id/view
 * @desc Track business profile view
 * @access Public with optional auth
 */
router.post(
  '/:id/view',
  param('id').isUUID().withMessage('Invalid business profile ID'),
  handleValidationErrors,
  controller.recordProfileView as RequestHandler
);

/**
 * @route GET /api/v1/business-profiles/similar/:id
 * @desc Get similar business profiles
 * @access Public
 */
router.get(
  '/similar/:id',
  param('id').isUUID().withMessage('Invalid business profile ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  handleValidationErrors,
  controller.getSimilarBusinesses as RequestHandler
);

export { router as businessProfileRouter };