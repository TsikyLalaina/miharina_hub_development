import { Router, RequestHandler } from 'express';
import { SuccessStoryController } from '../controllers/successStoryController';

const router = Router();
const controller = new SuccessStoryController();

// Define routes for success stories
router.get('/', controller.getStories as RequestHandler);
router.post('/', controller.createStory as RequestHandler);

export default router;
