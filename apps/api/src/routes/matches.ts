import { Router, RequestHandler } from 'express';
import { MatchingController } from '../controllers/matchingController';

const router = Router();
const controller = new MatchingController();

// Define routes for AI matching
router.get('/', controller.getMatches as RequestHandler);
router.post('/', controller.createMatch as RequestHandler);

export default router;
