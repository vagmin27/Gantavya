import { Router } from 'express';
import { UserController } from './users.controller.js';

const router = Router();

router.get('/status', UserController.getStatus);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);

export default router;
