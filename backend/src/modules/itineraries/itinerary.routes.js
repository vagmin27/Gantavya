import { Router } from 'express';
import { ItineraryController } from './itinerary.controller.js';
import { authenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

// Module health / status
router.get('/status', ItineraryController.getStatus);

// Reordering & Trip Schedule Recalculation
router.post('/reorder', authenticate, verifyCsrf, ItineraryController.reorderDays);
router.post('/trips/:tripId/recalculate', authenticate, verifyCsrf, ItineraryController.recalculateTripSchedule);

// Itinerary Day CRUD
router.get('/', authenticate, ItineraryController.listDays);
router.post('/', authenticate, verifyCsrf, ItineraryController.createDay);
router.get('/:id', authenticate, ItineraryController.getDayById);
router.put('/:id', authenticate, verifyCsrf, ItineraryController.updateDay);
router.delete('/:id', authenticate, verifyCsrf, ItineraryController.deleteDay);

// Transportation Integration, Timeline & Conflicts (Sub-Milestone 2.4.4)
router.post('/:dayId/transportation/integrate', authenticate, verifyCsrf, ItineraryController.integrateTransportation);
router.get('/:dayId/timeline', authenticate, ItineraryController.getDayTimeline);
router.post('/:dayId/validate-timeline', authenticate, verifyCsrf, ItineraryController.validateTimeline);
router.post('/:dayId/select-transit-alternative', authenticate, verifyCsrf, ItineraryController.selectTransitAlternative);
router.post('/:dayId/transit/:transitionId/lock', authenticate, verifyCsrf, ItineraryController.setTransitionLock);

export default router;
