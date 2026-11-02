import { Router } from 'express';
import { UserController } from './users.controller.js';
import { authenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/status', UserController.getStatus);
router.get('/me', authenticate, UserController.getMe);
router.patch('/me', authenticate, verifyCsrf, UserController.updateMe);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);

export default router;
