import { Router, RequestHandler } from 'express';
import { OpportunityController } from '../controllers/opportunityController';

const router = Router();
const controller = new OpportunityController();

// Define routes for opportunities
router.get('/', controller.getOpportunities as RequestHandler);
router.post('/', controller.createOpportunity as RequestHandler);

export default router;
