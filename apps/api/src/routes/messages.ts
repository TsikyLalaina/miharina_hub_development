import { Router, RequestHandler } from 'express';
import { MessagingController } from '../controllers/messagingController';

const router = Router();
const controller = new MessagingController();

// Define routes for messaging
router.get('/', controller.getMessages as RequestHandler);
router.post('/', controller.sendMessage as RequestHandler);

export default router;
