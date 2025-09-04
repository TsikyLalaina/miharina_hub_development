import { Router, RequestHandler, Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { BusinessProfileController } from '../controllers/businessProfileController';
import { OpportunityController } from '../controllers/opportunityController';
import { UploadController } from '../controllers/uploadController';
import { MatchingController } from '../controllers/matchingController';
import { MessagingController } from '../controllers/messagingController';
import { SuccessStoriesController } from '../controllers/successStoriesController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AdminController } from '../controllers/adminController';
import { upload } from '../middleware/upload';

const router = Router();
// Using centralized upload middleware configuration

// Initialize controllers
const authController = new AuthController();
const businessProfileController = new BusinessProfileController();
const opportunityController = new OpportunityController();
const uploadController = new UploadController();
const matchingController = new MatchingController();
const messagingController = new MessagingController();
const successStoriesController = new SuccessStoriesController();
const adminController = new AdminController();

// Auth routes
router.post('/auth/register', authController.register as RequestHandler);
router.post('/auth/login', authController.login as RequestHandler);
router.post('/auth/refresh-token', authController.refreshToken as RequestHandler);
router.post('/auth/logout', authController.logout as RequestHandler);
router.get('/auth/me', authenticateToken as RequestHandler, authController.getProfile as RequestHandler);
router.put('/auth/profile', authenticateToken as RequestHandler, authController.updateProfile as RequestHandler);

// Admin & role management routes
// Dev-only: bootstrap current user to admin
router.post('/admin/bootstrap', authenticateToken as RequestHandler, adminController.bootstrapAdmin as RequestHandler);

// Create user with specific role (admin only)
router.post(
  '/admin/users',
  authenticateToken as RequestHandler,
  requireRole(['admin']) as unknown as RequestHandler,
  adminController.createUserWithRole as RequestHandler
);

// Set user role by uid (admin only)
router.put(
  '/admin/users/:uid/role',
  authenticateToken as RequestHandler,
  requireRole(['admin']) as unknown as RequestHandler,
  adminController.setUserRole as RequestHandler
);

// Create business profile on behalf of a user (admin/partner)
router.post(
  '/admin/business-profiles',
  authenticateToken as RequestHandler,
  requireRole(['admin', 'partner']) as unknown as RequestHandler,
  businessProfileController.createBusinessProfileForUser as RequestHandler
);

// Role-protected test endpoints
router.get(
  '/protected/admin',
  authenticateToken as RequestHandler,
  requireRole(['admin']) as unknown as RequestHandler,
  adminController.adminOnly as RequestHandler
);
router.get(
  '/protected/partner',
  authenticateToken as RequestHandler,
  requireRole(['partner']) as unknown as RequestHandler,
  adminController.partnerOnly as RequestHandler
);
router.get(
  '/protected/entrepreneur',
  authenticateToken as RequestHandler,
  requireRole(['entrepreneur']) as unknown as RequestHandler,
  adminController.entrepreneurOnly as RequestHandler
);

// Business Profile routes
router.get('/business-profiles', businessProfileController.searchBusinessProfiles as RequestHandler);
router.get('/business-profiles/:id', businessProfileController.getBusinessProfile as RequestHandler);
router.post('/business-profiles', authenticateToken as RequestHandler, businessProfileController.createBusinessProfile as RequestHandler);
router.put('/business-profiles/:id', authenticateToken as RequestHandler, businessProfileController.updateBusinessProfile as RequestHandler);
router.delete('/business-profiles/:id', authenticateToken as RequestHandler, businessProfileController.deleteOwnBusinessProfile as RequestHandler);
router.get('/business-profiles/user/me', authenticateToken as RequestHandler, businessProfileController.getOwnBusinessProfile as RequestHandler);

// Opportunity routes
router.get('/opportunities', opportunityController.getOpportunities.bind(opportunityController) as RequestHandler);
router.get('/opportunities/:id', opportunityController.getOpportunity.bind(opportunityController) as RequestHandler);
router.post('/opportunities', authenticateToken as RequestHandler, opportunityController.createOpportunity.bind(opportunityController) as RequestHandler);
router.put('/opportunities/:id', authenticateToken as RequestHandler, opportunityController.updateOpportunity.bind(opportunityController) as RequestHandler);
router.delete('/opportunities/:id', authenticateToken as RequestHandler, opportunityController.deleteOpportunity.bind(opportunityController) as RequestHandler);
router.get('/opportunities/user/me', authenticateToken as RequestHandler, opportunityController.getMyOpportunities.bind(opportunityController) as RequestHandler);

// Upload routes
router.post('/upload', authenticateToken as RequestHandler, upload.single('file'), uploadController.uploadFile.bind(uploadController) as RequestHandler);
router.get('/uploads', authenticateToken as RequestHandler, uploadController.getUploads.bind(uploadController) as RequestHandler);
router.delete('/uploads/:id', authenticateToken as RequestHandler, uploadController.deleteUpload.bind(uploadController) as RequestHandler);

// Matching routes
router.get('/matches/find', authenticateToken as RequestHandler, matchingController.findMatches as RequestHandler);
router.get('/matches', authenticateToken as RequestHandler, matchingController.getMatches as RequestHandler);
router.post('/matches', authenticateToken as RequestHandler, matchingController.createMatch as RequestHandler);
router.put('/matches/:id/status', authenticateToken as RequestHandler, matchingController.updateMatchStatus as RequestHandler);
router.get('/matches/stats', authenticateToken as RequestHandler, matchingController.getMatchStats as RequestHandler);

// Messaging routes (bind to preserve 'this' context)
router.post(
  '/messages',
  authenticateToken as RequestHandler,
  messagingController.sendMessage.bind(messagingController) as RequestHandler
);
router.get(
  '/messages',
  authenticateToken as RequestHandler,
  messagingController.getMessages.bind(messagingController) as RequestHandler
);
router.get(
  '/conversations',
  authenticateToken as RequestHandler,
  messagingController.getConversations.bind(messagingController) as RequestHandler
);
router.post(
  '/messages/mark-read',
  authenticateToken as RequestHandler,
  messagingController.markMessagesAsRead.bind(messagingController) as RequestHandler
);
router.delete(
  '/messages/:id',
  authenticateToken as RequestHandler,
  messagingController.deleteMessage.bind(messagingController) as RequestHandler
);

// Success Stories routes (bind to preserve 'this' context)
router.get('/success-stories', successStoriesController.getSuccessStories.bind(successStoriesController) as RequestHandler);
router.get('/success-stories/:id', successStoriesController.getSuccessStory.bind(successStoriesController) as RequestHandler);
router.post('/success-stories', authenticateToken as RequestHandler, successStoriesController.createSuccessStory.bind(successStoriesController) as RequestHandler);
router.put('/success-stories/:id', authenticateToken as RequestHandler, successStoriesController.updateSuccessStory.bind(successStoriesController) as RequestHandler);
router.delete('/success-stories/:id', authenticateToken as RequestHandler, successStoriesController.deleteSuccessStory.bind(successStoriesController) as RequestHandler);
router.get('/success-stories/user/me', authenticateToken as RequestHandler, successStoriesController.getMySuccessStories.bind(successStoriesController) as RequestHandler);

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
