/**
 * Itinerary Transportation Service
 * Gantavya Platform - Milestone 2.4.4
 *
 * Connects the multimodal route optimization engine with daily itineraries.
 * Evaluates transit between activities and destinations, attaches selected
 * and alternative routes, and persists them into MongoDB.
 */

import { ItineraryDay } from './itinerary-day.model.js';
import { Trip } from '../trips/trip.model.js';
import { Activity } from '../activities/activity.model.js';
import { Destination } from '../destinations/destination.model.js';
import { ItineraryService } from './itinerary.service.js';
import { RouteOptimizerService } from '../transportation/route-optimizer.service.js';
import { GroupConstraintsService } from './group-constraints.service.js';

export class ItineraryTransportationService {
  constructor(options = {}) {
    this.routeOptimizerService = options.routeOptimizerService || new RouteOptimizerService();
  }

  /**
   * Helper to build a standardized TransportNode object from entity/coordinates.
   */
  static toTransportNode(entity, fallbackName = 'Location') {
    if (!entity) {
      return {
        nodeId: `node_${Date.now()}`,
        name: fallbackName,
        nodeType: 'coordinates',
        coordinates: [77.2090, 28.6139], // Default Delhi coordinates
        city: '',
        country: ''
      };
    }

    if (entity.nodeId || entity.node_id) {
      return {
        nodeId: entity.nodeId || entity.node_id,
        name: entity.name || fallbackName,
        nodeType: entity.nodeType || entity.node_type || 'coordinates',
        code: entity.code || null,
        coordinates: entity.coordinates || [77.2090, 28.6139],
        city: entity.city || '',
        country: entity.country || ''
      };
    }

    const coords = entity.coordinates ||
      (entity.location && entity.location.coordinates) ||
      (entity.locationDetails && entity.locationDetails.coordinates) ||
      [77.2090, 28.6139];

    return {
      nodeId: entity._id ? entity._id.toString() : `node_${Date.now()}`,
      name: entity.name || entity.title || fallbackName,
      nodeType: entity.category ? 'poi' : 'coordinates',
      code: entity.code || null,
      coordinates: Array.isArray(coords) ? coords : [coords.longitude || 77.2090, coords.latitude || 28.6139],
      city: entity.city || '',
      country: entity.country || ''
    };
  }

  /**
   * Analyzes consecutive locations on an itinerary day, runs multimodal
   * route optimization, and associates transit transitions with selected and alternative routes.
   *
   * @param {string} itineraryDayId
   * @param {Object} [options]
   * @param {string} [userId]
   * @returns {Promise<Object>} Updated ItineraryDay document
   */
  async integrateDayTransportation(itineraryDayId, options = {}, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    const trip = await ItineraryService.verifyTripEditAccess(day.tripId, userId);
    const destination = await Destination.findById(trip.destinationId);
    const groupConstraints = await GroupConstraintsService.resolveGroupConstraints(trip);

    // Fetch activities for the day in chronological sequence
    const activities = await Activity.find({ itineraryDayId: day._id })
      .sort({ sequence: 1 })
      .populate('placeId');

    const calendarDate = new Date(day.calendarDate);
    const defaultStartTime = new Date(calendarDate);
    defaultStartTime.setHours(9, 0, 0, 0);

    // Preserve existing locked transitions
    const lockedTransitions = (day.transitions || []).filter((t) => t.isLocked);
    const generatedTransitions = [];

    // Case 1: Custom origin-destination route integration passed in options
    if (options.origin && options.destination) {
      const originNode = ItineraryTransportationService.toTransportNode(options.origin, 'Origin');
      const destNode = ItineraryTransportationService.toTransportNode(options.destination, 'Destination');
      const departureTime = options.departureTime ? new Date(options.departureTime) : defaultStartTime;

      const optResult = await this.routeOptimizerService.optimizeJourney({
        tripId: trip._id.toString(),
        origin: originNode,
        destination: destNode,
        departureDate: departureTime,
        modes: groupConstraints.allowedModes,
        constraints: {
          maxBudget: groupConstraints.maxBudget,
          currency: groupConstraints.currency
        },
        preferences: {
          allowedModes: groupConstraints.allowedModes
        }
      });

      const selectedCategory = options.preferredCategory || 'best_overall';
      const routes = optResult.routes || {};
      const selectedRoute = routes[selectedCategory] || routes.best_overall || Object.values(routes)[0] || null;

      let departureTimeVal = new Date(departureTime);
      let durationMinutes = 60;
      let distanceMeters = 10000;

      if (selectedRoute) {
        const rawDep = selectedRoute.departureTime || selectedRoute.departure_time;
        if (rawDep && !isNaN(new Date(rawDep).getTime())) {
          departureTimeVal = new Date(rawDep);
        }
        durationMinutes = selectedRoute.totalDurationMinutes ?? selectedRoute.total_duration_minutes ?? 60;
        distanceMeters = selectedRoute.totalDistanceMeters ?? selectedRoute.total_distance_meters ?? 10000;
      }

      let arrivalTimeVal = new Date(departureTimeVal.getTime() + durationMinutes * 60 * 1000);
      if (selectedRoute) {
        const rawArr = selectedRoute.arrivalTime || selectedRoute.arrival_time;
        if (rawArr && !isNaN(new Date(rawArr).getTime())) {
          arrivalTimeVal = new Date(rawArr);
        }
      }

      const isOvernight = arrivalTimeVal.getDate() !== departureTimeVal.getDate();

      generatedTransitions.push({
        transitionId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fromType: 'custom',
        fromLocation: originNode,
        toType: 'custom',
        toLocation: destNode,
        departureTime: departureTimeVal,
        arrivalTime: arrivalTimeVal,
        durationMinutes,
        distanceMeters,
        isOvernight,
        arrivalDayNumber: isOvernight ? day.dayNumber + 1 : day.dayNumber,
        selectedCategory,
        selectedRoute,
        alternativeRoutes: routes,
        bookingStatus: 'unbooked',
        isLocked: false,
        providerReferences: selectedRoute ? [selectedRoute.routeId || selectedRoute.route_id || 'route_ref'] : []
      });
    }

    // Case 2: Transit between consecutive activities
    if (activities.length > 1) {
      for (let i = 0; i < activities.length - 1; i++) {
        const actCurrent = activities[i];
        const actNext = activities[i + 1];

        // Check if a locked transition already links these two
        const alreadyLocked = lockedTransitions.find(
          (t) => t.fromId?.toString() === actCurrent._id.toString() &&
                 t.toId?.toString() === actNext._id.toString()
        );
        if (alreadyLocked) {
          generatedTransitions.push(alreadyLocked);
          continue;
        }

        const originNode = ItineraryTransportationService.toTransportNode(
          actCurrent.placeId || actCurrent.locationDetails,
          actCurrent.title
        );
        const destNode = ItineraryTransportationService.toTransportNode(
          actNext.placeId || actNext.locationDetails,
          actNext.title
        );

        // Departure is right after the current activity ends
        const [endH, endM] = (actCurrent.endTime || '11:00').split(':').map(Number);
        const actDeparture = new Date(calendarDate);
        actDeparture.setHours(endH, endM, 0, 0);

        const optResult = await this.routeOptimizerService.optimizeJourney({
          tripId: trip._id.toString(),
          origin: originNode,
          destination: destNode,
          departureDate: actDeparture,
          modes: ['car', 'bus', 'walking', 'train'], // Local modes
          constraints: {
            maxBudget: groupConstraints.maxBudget,
            currency: groupConstraints.currency
          },
          preferences: {
            allowedModes: groupConstraints.allowedModes
          }
        });

        const routes = optResult.routes || {};
        const selectedRoute = routes.best_overall || routes.fastest || Object.values(routes)[0] || null;

        let transDep = new Date(actDeparture);
        if (selectedRoute) {
          const rawDep = selectedRoute.departureTime || selectedRoute.departure_time;
          if (rawDep && !isNaN(new Date(rawDep).getTime())) {
            transDep = new Date(rawDep);
          }
        }

        const durationMinutes = selectedRoute
          ? (selectedRoute.totalDurationMinutes ?? selectedRoute.total_duration_minutes ?? 30)
          : (actCurrent.travelTimeToNextMinutes || 30);
        const distanceMeters = selectedRoute
          ? (selectedRoute.totalDistanceMeters ?? selectedRoute.total_distance_meters ?? 5000)
          : (actCurrent.travelDistanceToNextMeters || 5000);

        let arrivalTime = new Date(transDep.getTime() + durationMinutes * 60 * 1000);
        if (selectedRoute) {
          const rawArr = selectedRoute.arrivalTime || selectedRoute.arrival_time;
          if (rawArr && !isNaN(new Date(rawArr).getTime())) {
            arrivalTime = new Date(rawArr);
          }
        }

        generatedTransitions.push({
          transitionId: `trans_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          fromType: 'activity',
          fromId: actCurrent._id,
          fromLocation: originNode,
          toType: 'activity',
          toId: actNext._id,
          toLocation: destNode,
          departureTime: transDep,
          arrivalTime,
          durationMinutes,
          distanceMeters,
          isOvernight: false,
          arrivalDayNumber: day.dayNumber,
          selectedCategory: 'best_overall',
          selectedRoute,
          alternativeRoutes: routes,
          bookingStatus: 'unbooked',
          isLocked: false,
          providerReferences: selectedRoute ? [selectedRoute.routeId || selectedRoute.route_id || 'route_ref'] : []
        });
      }
    }

    // Merge locked transitions that weren't part of consecutive activity pairs
    for (const locked of lockedTransitions) {
      if (!generatedTransitions.some((t) => t.transitionId === locked.transitionId)) {
        generatedTransitions.push(locked);
      }
    }

    // Sort transitions chronologically by departure time
    generatedTransitions.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

    // Update aggregate travel stats on ItineraryDay
    const totalDistMeters = generatedTransitions.reduce((sum, t) => sum + (t.distanceMeters || 0), 0);
    const totalDurationMins = generatedTransitions.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);

    day.transitions = generatedTransitions;
    day.travelDistanceKm = Math.round((totalDistMeters / 1000) * 10) / 10;
    day.travelDurationMinutes = totalDurationMins;

    return await day.save();
  }

  /**
   * Switches the selected route option for an existing transition to another ranked category
   * (e.g. from 'best_overall' to 'cheapest' or 'fastest').
   */
  async selectTransitAlternative(itineraryDayId, transitionId, routeCategory, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    await ItineraryService.verifyTripEditAccess(day.tripId, userId);

    const transition = day.transitions.find((t) => t.transitionId === transitionId || t._id?.toString() === transitionId);
    if (!transition) {
      const error = new Error(`Transition with ID '${transitionId}' not found on day ${day.dayNumber}`);
      error.statusCode = 404;
      throw error;
    }

    const alternatives = transition.alternativeRoutes || {};
    const newRoute = alternatives[routeCategory];
    if (!newRoute) {
      const error = new Error(`Alternative route category '${routeCategory}' is not available for this transition`);
      error.statusCode = 400;
      throw error;
    }

    transition.selectedCategory = routeCategory;
    transition.selectedRoute = newRoute;
    transition.durationMinutes = newRoute.totalDurationMinutes ?? newRoute.total_duration_minutes ?? transition.durationMinutes;
    transition.distanceMeters = newRoute.totalDistanceMeters ?? newRoute.total_distance_meters ?? transition.distanceMeters;

    const rawDep = newRoute.departureTime || newRoute.departure_time;
    const rawArr = newRoute.arrivalTime || newRoute.arrival_time;

    if (rawDep && !isNaN(new Date(rawDep).getTime())) {
      transition.departureTime = new Date(rawDep);
    }
    if (rawArr && !isNaN(new Date(rawArr).getTime())) {
      transition.arrivalTime = new Date(rawArr);
    } else {
      transition.arrivalTime = new Date(new Date(transition.departureTime).getTime() + transition.durationMinutes * 60 * 1000);
    }

    transition.isOvernight = transition.arrivalTime.getDate() !== transition.departureTime.getDate();
    transition.arrivalDayNumber = transition.isOvernight ? day.dayNumber + 1 : day.dayNumber;

    // Recalculate day stats
    const totalDistMeters = day.transitions.reduce((sum, t) => sum + (t.distanceMeters || 0), 0);
    const totalDurationMins = day.transitions.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
    day.travelDistanceKm = Math.round((totalDistMeters / 1000) * 10) / 10;
    day.travelDurationMinutes = totalDurationMins;

    return await day.save();
  }

  /**
   * Locks or unlocks a transition to freeze it during dynamic recalculation.
   */
  async setTransitionLock(itineraryDayId, transitionId, isLocked, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    await ItineraryService.verifyTripEditAccess(day.tripId, userId);

    const transition = day.transitions.find((t) => t.transitionId === transitionId || t._id?.toString() === transitionId);
    if (!transition) {
      const error = new Error(`Transition with ID '${transitionId}' not found`);
      error.statusCode = 404;
      throw error;
    }

    transition.isLocked = Boolean(isLocked);
    return await day.save();
  }
}

export const defaultItineraryTransportationService = new ItineraryTransportationService();
