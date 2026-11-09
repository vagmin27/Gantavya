import { Router } from 'express';
import { TripController } from './trip.controller.js';
import { authenticate, optionalAuthenticate, verifyCsrf } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/status', TripController.getStatus);

// Invitation action endpoints (must be before /:id)
router.post('/invitations/accept', authenticate, verifyCsrf, TripController.acceptInvitation);
router.post('/invitations/decline', verifyCsrf, TripController.declineInvitation);

// Main Trip collection endpoints
router.get('/', authenticate, TripController.list);
router.post('/', optionalAuthenticate, TripController.create);

// Individual Trip resource endpoints
router.get('/:id', authenticate, TripController.getById);
router.put('/:id', authenticate, verifyCsrf, TripController.update);
router.delete('/:id', authenticate, verifyCsrf, TripController.delete);

// Trip Collaboration & Invitations
router.post('/:id/invitations', authenticate, verifyCsrf, TripController.invite);
router.delete('/:id/invitations/:invitationId', authenticate, verifyCsrf, TripController.cancelInvitation);
router.post('/:id/participants', authenticate, verifyCsrf, TripController.addParticipant);
router.patch('/:id/participants/:participantId', authenticate, verifyCsrf, TripController.updateParticipantRole);
router.delete('/:id/participants/:participantId', authenticate, verifyCsrf, TripController.removeParticipant);

// Trip Intelligence Planning
router.post('/:id/generate-itinerary', authenticate, verifyCsrf, TripController.generateItinerary);

export default router;
