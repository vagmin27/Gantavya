import { Router } from 'express';
import { ApiResponse } from '../../utils/api-response.js';

const router = Router();

// Foundational route placeholder - Authentication endpoints will be implemented in Milestone 2
router.get('/status', (req, res) => {
  ApiResponse.success(res, { module: 'auth', initialized: true }, 'Auth module initialized');
});

export default router;

