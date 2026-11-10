import { apiClient } from './api';

export const TripService = {
  // Trips
  async listTrips(params = {}) {
    const response = await apiClient.get('/trips', { params });
    return response.data;
  },

  async getTrip(id) {
    const response = await apiClient.get(`/trips/${id}`);
    return response.data;
  },

  async createTrip(data) {
    const response = await apiClient.post('/trips', data);
    return response.data;
  },

  async updateTrip(id, data) {
    const response = await apiClient.put(`/trips/${id}`, data);
    return response.data;
  },

  async deleteTrip(id) {
    const response = await apiClient.delete(`/trips/${id}`);
    return response.data;
  },

  // Collaboration & Invitations
  async inviteParticipant(tripId, { email, role }) {
    const response = await apiClient.post(`/trips/${tripId}/invitations`, { email, role });
    return response.data;
  },

  async cancelInvitation(tripId, invitationId) {
    const response = await apiClient.delete(`/trips/${tripId}/invitations/${invitationId}`);
    return response.data;
  },

  async acceptInvitation(token) {
    const response = await apiClient.post('/trips/invitations/accept', { token });
    return response.data;
  },

  async declineInvitation(token) {
    const response = await apiClient.post('/trips/invitations/decline', { token });
    return response.data;
  },

  async updateParticipantRole(tripId, participantId, role) {
    const response = await apiClient.patch(`/trips/${tripId}/participants/${participantId}`, { role });
    return response.data;
  },

  async removeParticipant(tripId, participantId) {
    const response = await apiClient.delete(`/trips/${tripId}/participants/${participantId}`);
    return response.data;
  },

  // Intelligence Itinerary Generation
  async generateItinerary(tripId, { confirmOverwrite = false } = {}) {
    const response = await apiClient.post(`/trips/${tripId}/generate-itinerary`, {
      confirmOverwrite
    });
    return response.data;
  },

  // Itinerary Days
  async getItineraryDays(tripId) {
    const response = await apiClient.get(`/itineraries?tripId=${tripId}`);
    return response.data;
  },

  async createItineraryDay(data) {
    const response = await apiClient.post('/itineraries', data);
    return response.data;
  },

  async reorderDays(tripId, dayOrders) {
    const response = await apiClient.post('/itineraries/reorder', { tripId, dayOrders });
    return response.data;
  },

  // Activities
  async getActivities(itineraryDayId) {
    const response = await apiClient.get(`/activities?itineraryDayId=${itineraryDayId}`);
    return response.data;
  },

  async createActivity(data) {
    const response = await apiClient.post('/activities', data);
    return response.data;
  },

  async updateActivity(id, data) {
    const response = await apiClient.put(`/activities/${id}`, data);
    return response.data;
  },

  async deleteActivity(id) {
    const response = await apiClient.delete(`/activities/${id}`);
    return response.data;
  },

  async reorderActivities(itineraryDayId, activityOrders) {
    const response = await apiClient.post('/activities/reorder', { itineraryDayId, activityOrders });
    return response.data;
  },

  // Destinations & Places
  async getDestinations(params = {}) {
    const response = await apiClient.get('/destinations', { params });
    return response.data;
  },

  async getDestination(id) {
    const response = await apiClient.get(`/destinations/${id}`);
    return response.data;
  },

  async getPlaces(destinationId) {
    const response = await apiClient.get(`/places?destinationId=${destinationId}`);
    return response.data;
  },

  // Sub-Milestone 2.4.4: Transportation & Timeline Integration
  async integrateTransportation(dayId, options = {}) {
    const response = await apiClient.post(`/itineraries/${dayId}/transportation/integrate`, options);
    return response.data;
  },

  async getDayTimeline(dayId) {
    const response = await apiClient.get(`/itineraries/${dayId}/timeline`);
    return response.data;
  },

  async validateTimeline(dayId) {
    const response = await apiClient.post(`/itineraries/${dayId}/validate-timeline`);
    return response.data;
  },

  async selectTransitAlternative(dayId, { transitionId, routeCategory }) {
    const response = await apiClient.post(`/itineraries/${dayId}/select-transit-alternative`, {
      transitionId,
      routeCategory
    });
    return response.data;
  },

  async lockTransition(dayId, transitionId, isLocked) {
    const response = await apiClient.post(`/itineraries/${dayId}/transit/${transitionId}/lock`, {
      isLocked
    });
    return response.data;
  },

  async recalculateTrip(tripId, fromDayNumber = 1) {
    const response = await apiClient.post(`/itineraries/trips/${tripId}/recalculate`, {
      fromDayNumber
    });
    return response.data;
  }
};

