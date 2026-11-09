import { Router } from 'express';
import { TransportationController } from './transportation.controller.js';

const router = Router();

router.get('/status', TransportationController.getStatus);
router.get('/providers/status', TransportationController.getProvidersStatus);
router.post('/search', TransportationController.searchTransportation);
router.post('/validate-leg', TransportationController.validateLegPayload);
router.post('/cache/purge', TransportationController.purgeCache);

export default router;
