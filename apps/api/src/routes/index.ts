import { Router, RequestHandler, Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { BusinessProfileController } from '../controllers/businessProfileController';
import { OpportunityController } from '../controllers/opportunityController';
import { UploadController } from '../controllers/uploadController';
import { MatchingController } from '../controllers/matchingController';
import { MessagingController } from '../controllers/messagingController';
import { SuccessStoriesController } from '../controllers/successStoriesController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize controllers
const authController = new AuthController();
const businessProfileController = new BusinessProfileController();
const opportunityController = new OpportunityController();
const uploadController = new UploadController();
const matchingController = new MatchingController();
const messagingController = new MessagingController();
const successStoriesController = new SuccessStoriesController();

// Auth routes
router.post('/auth/register', authController.register as RequestHandler);
router.post('/auth/login', authController.login as RequestHandler);
router.post('/auth/refresh-token', authController.refreshToken as RequestHandler);
router.post('/auth/logout', authController.logout as RequestHandler);
router.get('/auth/me', authenticateToken as RequestHandler, authController.getProfile as RequestHandler);
router.put('/auth/profile', authenticateToken as RequestHandler, authController.updateProfile as RequestHandler);

// Business Profile routes
router.get('/business-profiles', businessProfileController.searchBusinessProfiles as RequestHandler);
router.get('/business-profiles/:id', businessProfileController.getBusinessProfile as RequestHandler);
router.post('/business-profiles', authenticateToken as RequestHandler, businessProfileController.createBusinessProfile as RequestHandler);
router.put('/business-profiles/:id', authenticateToken as RequestHandler, businessProfileController.updateBusinessProfile as RequestHandler);
router.delete('/business-profiles/:id', authenticateToken as RequestHandler, businessProfileController.deleteOwnBusinessProfile as RequestHandler);
router.get('/business-profiles/user/me', authenticateToken as RequestHandler, businessProfileController.getOwnBusinessProfile as RequestHandler);

// Opportunity routes
router.get('/opportunities', opportunityController.getOpportunities as RequestHandler);
router.get('/opportunities/:id', opportunityController.getOpportunity as RequestHandler);
router.post('/opportunities', authenticateToken as RequestHandler, opportunityController.createOpportunity as RequestHandler);
router.put('/opportunities/:id', authenticateToken as RequestHandler, opportunityController.updateOpportunity as RequestHandler);
router.delete('/opportunities/:id', authenticateToken as RequestHandler, opportunityController.deleteOpportunity as RequestHandler);
router.get('/opportunities/user/me', authenticateToken as RequestHandler, opportunityController.getMyOpportunities as RequestHandler);

// Upload routes
router.post('/upload', authenticateToken as RequestHandler, upload.single('file'), uploadController.uploadFile as RequestHandler);
router.get('/uploads', authenticateToken as RequestHandler, uploadController.getUploads as RequestHandler);
router.delete('/uploads/:id', authenticateToken as RequestHandler, uploadController.deleteUpload as RequestHandler);

// Matching routes
router.get('/matches/find', authenticateToken as RequestHandler, matchingController.findMatches as RequestHandler);
router.get('/matches', authenticateToken as RequestHandler, matchingController.getMatches as RequestHandler);
router.post('/matches', authenticateToken as RequestHandler, matchingController.createMatch as RequestHandler);
router.put('/matches/:id/status', authenticateToken as RequestHandler, matchingController.updateMatchStatus as RequestHandler);
router.get('/matches/stats', authenticateToken as RequestHandler, matchingController.getMatchStats as RequestHandler);

// Messaging routes
router.post('/messages', authenticateToken as RequestHandler, messagingController.sendMessage as RequestHandler);
router.get('/messages', authenticateToken as RequestHandler, messagingController.getMessages as RequestHandler);
router.get('/conversations', authenticateToken as RequestHandler, messagingController.getConversations as RequestHandler);
router.post('/messages/mark-read', authenticateToken as RequestHandler, messagingController.markMessagesAsRead as RequestHandler);
router.delete('/messages/:id', authenticateToken as RequestHandler, messagingController.deleteMessage as RequestHandler);

// Success Stories routes
router.get('/success-stories', successStoriesController.getSuccessStories as RequestHandler);
router.get('/success-stories/:id', successStoriesController.getSuccessStory as RequestHandler);
router.post('/success-stories', authenticateToken as RequestHandler, successStoriesController.createSuccessStory as RequestHandler);
router.put('/success-stories/:id', authenticateToken as RequestHandler, successStoriesController.updateSuccessStory as RequestHandler);
router.delete('/success-stories/:id', authenticateToken as RequestHandler, successStoriesController.deleteSuccessStory as RequestHandler);
router.get('/success-stories/user/me', authenticateToken as RequestHandler, successStoriesController.getMySuccessStories as RequestHandler);

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
