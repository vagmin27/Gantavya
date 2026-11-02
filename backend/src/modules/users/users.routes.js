import { Router } from 'express';
import { ApiResponse } from '../../utils/api-response.js';

const router = Router();

// Foundational route placeholder - User management endpoints will be implemented in subsequent milestones
router.get('/status', (req, res) => {
  ApiResponse.success(res, { module: 'users', initialized: true }, 'Users module initialized');
});

export default router;

