import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/status', AuthController.getStatus);
router.post('/register', verifyCsrf, AuthController.register);
router.post('/login', verifyCsrf, AuthController.login);
router.post('/refresh', verifyCsrf, AuthController.refresh);
router.post('/logout', verifyCsrf, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export default router;
