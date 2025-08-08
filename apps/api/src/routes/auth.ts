import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// Placeholder for authentication routes
router.post('/login', authController.login as RequestHandler);
router.post('/register', authController.register as RequestHandler);

export default router;
