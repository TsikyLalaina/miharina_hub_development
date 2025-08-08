// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById, MadagascarUserClaims } from '../config/firebase';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../types/express';

/**
 * Middleware to authenticate Firebase token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Authorization header missing',
        error_fr: 'En-tête d\'autorisation manquant',
        error_mg: 'Tsy misy ny lohan\'ny fanomezan-dàlana'
      });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      res.status(401).json({
        error: 'Token missing',
        error_fr: 'Jeton manquant',
        error_mg: 'Tsy misy ny famantarana'
      });
      return;
    }

    // Verify Firebase token
    const decodedToken = await verifyToken(token);

    // Get full user record with custom claims
    const userRecord = await getUserById(decodedToken.uid);

    if (!userRecord) {
      res.status(401).json({
        error: 'User not found',
        error_fr: 'Utilisateur non trouvé',
        error_mg: 'Tsy hita ny mpampiasa'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      uid: userRecord.uid,
      ...(userRecord.email && { email: userRecord.email }),
      ...(userRecord.phoneNumber && { phoneNumber: userRecord.phoneNumber }),
      ...(userRecord.displayName && { displayName: userRecord.displayName }),
      ...(userRecord.customClaims && { customClaims: userRecord.customClaims as MadagascarUserClaims }),
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error);

    let errorMessage = 'Authentication failed';
    let errorCode = 401;

    // Type guard to check if error is an object with code property
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/id-token-expired') {
        errorMessage = 'Token expired';
      } else if (firebaseError.code === 'auth/id-token-revoked') {
        errorMessage = 'Token revoked';
      } else if (firebaseError.code === 'auth/invalid-id-token') {
        errorMessage = 'Invalid token';
      }
    }

    res.status(errorCode).json({
      error: errorMessage,
      error_fr: 'Échec de l\'authentification',
      error_mg: 'Tsy voamarina ny famantarana'
    });
  }
};

/**
 * Middleware to ensure user has business profile
 */
export const requireBusinessProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        error_fr: 'Authentification requise',
        error_mg: 'Ilaina ny fanamarinana'
      });
      return;
    }

    // Fixed: Use correct column names and no schema prefix needed
    const authReq = req as AuthenticatedRequest;
    const result = await query(`
      SELECT 
        business_id, user_id, business_type, region, is_verified, 
        verification_status
      FROM business_profiles 
      WHERE user_id = $1
    `, [authReq.user.uid]);

    if (result.rows.length === 0) {
      res.status(403).json({
        error: 'Business profile required',
        error_fr: 'Profil d\'entreprise requis',
        error_mg: 'Ilaina ny mombamomba ny orinasa'
      });
      return;
    }

    const businessProfile = result.rows[0];

    // Attach business profile to request
    (req as any).businessProfile = businessProfile;

    next();

  } catch (error) {
    console.error('Business profile check error:', error);
    res.status(500).json({
      error: 'Failed to verify business profile',
      error_fr: 'Échec de la vérification du profil d\'entreprise',
      error_mg: 'Tsy voamarina ny mombamomba ny orinasa'
    });
  }
};

/**
 * Middleware to require verified business
 */
export const requireVerifiedBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessReq = req as any;

  // Fixed: Use correct column name and check verification status
  if (!businessReq.businessProfile?.is_verified || businessReq.businessProfile?.verification_status !== 'approved') {
    res.status(403).json({
      error: 'Verified business required',
      error_fr: 'Entreprise vérifiée requise',
      error_mg: 'Ilaina ny orinasa voamarina',
      hint: 'Please complete business verification process',
      current_status: businessReq.businessProfile?.verification_status || 'unknown'
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user is from Madagascar
 */
export const requireMadagascarUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      error_fr: 'Authentification requise',
      error_mg: 'Ilaina ny fanamarinana'
    });
    return;
  }

  const authReq = req as AuthenticatedRequest;
  const claims = authReq.user.customClaims;

  if (!claims || claims.country !== 'madagascar') {
    res.status(403).json({
      error: 'Madagascar users only',
      error_fr: 'Utilisateurs de Madagascar uniquement',
      error_mg: 'Ho an\'ny mpampiasa Malagasy ihany'
    });
    return;
  }

  next();
};

/**
 * Middleware to check business type
 */
export const requireBusinessType = (allowedTypes: ('agricultural' | 'artisan' | 'digital_services' | 'manufacturing')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const businessProfile = (req as any).businessProfile;
    const businessType = businessProfile?.business_type;

    if (!businessType || !allowedTypes.includes(businessType as any)) {
      res.status(403).json({
        error: `Business type must be one of: ${allowedTypes.join(', ')}`,
        error_fr: `Le type d'entreprise doit être: ${allowedTypes.join(', ')}`,
        error_mg: `Ny karazana orinasa dia tokony ho: ${allowedTypes.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check user region
 */
export const requireRegion = (allowedRegions: ('Antananarivo' | 'Fianarantsoa' | 'Toamasina' | 'Mahajanga' | 'Toliara' | 'Antsiranana')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const businessProfile = (req as any).businessProfile;
    const region = businessProfile?.region;

    if (!region || !allowedRegions.includes(region as any)) {
      res.status(403).json({
        error: `Region must be one of: ${allowedRegions.join(', ')}`,
        error_fr: `La région doit être: ${allowedRegions.join(', ')}`,
        error_mg: `Ny faritra dia tokony ho: ${allowedRegions.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check user role
 */
export const requireRole = (allowedRoles: ('entrepreneur' | 'admin' | 'partner')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const role = user?.customClaims?.role;

    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        error: `Role must be one of: ${allowedRoles.join(', ')}`,
        error_fr: `Le rôle doit être: ${allowedRoles.join(', ')}`,
        error_mg: `Ny andraikitra dia tokony ho: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - sets user if token is present but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      next();
      return;
    }

    // Try to verify token, but don't fail if invalid
    const decodedToken = await verifyToken(token);
    const userRecord = await getUserById(decodedToken.uid);

    if (userRecord) {
      req.user = {
        uid: userRecord.uid,
        ...(userRecord.email && { email: userRecord.email }),
        ...(userRecord.phoneNumber && { phoneNumber: userRecord.phoneNumber }),
        ...(userRecord.displayName && { displayName: userRecord.displayName }),
        ...(userRecord.customClaims && { customClaims: userRecord.customClaims as MadagascarUserClaims }),
      };
    }

    next();

  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};

/**
 * Rate limiting by user
 */
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.uid;

    if (!userId) {
      next();
      return;
    }

    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize counter
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        error_fr: 'Trop de demandes',
        error_mg: 'Fangatahana be loatra',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
      return;
    }

    userLimit.count++;
    next();
  };
};