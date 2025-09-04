import { Router, RequestHandler } from 'express';
import { MessagingController } from '../controllers/messagingController';

const router = Router();
const controller = new MessagingController();

// Define routes for messaging with proper binding to preserve 'this' context
router.get('/', controller.getMessages.bind(controller) as RequestHandler);
router.post('/', controller.sendMessage.bind(controller) as RequestHandler);

export default router;
