import { Router } from 'express';
import { ProfileController } from './profile.controller.js';

const router = Router();

router.get('/status', ProfileController.getStatus);
router.get('/:userId', ProfileController.getProfile);
router.put('/:userId', ProfileController.updateProfile);

export default router;

