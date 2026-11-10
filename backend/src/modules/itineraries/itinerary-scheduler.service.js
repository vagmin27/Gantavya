/**
 * Itinerary Scheduler & Timeline Service
 * Gantavya Platform - Milestone 2.4.4
 *
 * Implements the unified day-wise timeline engine, deterministic conflict detection
 * across 7 conflict types, and dynamic schedule recalculation preserving locked items.
 */

import { ItineraryDay, CONFLICT_TYPE_ENUM } from './itinerary-day.model.js';
import { Activity } from '../activities/activity.model.js';
import { Trip } from '../trips/trip.model.js';
import { TripService } from '../trips/trip.service.js';
import { ItineraryService } from './itinerary.service.js';

export class ItinerarySchedulerService {
  /**
   * Builds a unified chronological timeline of all activities, transit transitions,
   * transfers, and accommodations for an itinerary day.
   *
   * @param {string} itineraryDayId
   * @param {string} [userId]
   * @returns {Promise<Object>} Unified timeline object with detected conflicts
   */
  static async buildDayTimeline(itineraryDayId, userId = null) {
    const day = await ItineraryDay.findById(itineraryDayId);
    if (!day) {
      const error = new Error('Itinerary day not found');
      error.statusCode = 404;
      throw error;
    }

    let trip;
    if (userId) {
      trip = await TripService.getTripById(day.tripId, userId);
    } else {
      trip = await Trip.findById(day.tripId);
      if (!trip) {
        const error = new Error('Trip not found');
        error.statusCode = 404;
        throw error;
      }
    }

    const activities = await Activity.find({ itineraryDayId: day._id })
      .sort({ sequence: 1 })
      .populate('placeId');

    const calendarDate = new Date(day.calendarDate);
    const dateStr = calendarDate.toISOString().split('T')[0];

    const timelineItems = [];

    // 1. Process Activities
    for (const act of activities) {
      const [startH, startM] = (act.startTime || '09:00').split(':').map(Number);
      const [endH, endM] = (act.endTime || '10:30').split(':').map(Number);

      const start = new Date(calendarDate);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(calendarDate);
      end.setHours(endH, endM, 0, 0);

      // Handle overnight activities
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      timelineItems.push({
        id: `act_${act._id}`,
        entityId: act._id.toString(),
        type: 'activity',
        title: act.title,
        sequence: act.sequence,
        startTime: start,
        endTime: end,
        durationMinutes: act.durationMinutes,
        isLocked: Boolean(act.isLocked),
        openingHours: act.openingHours || null,
        status: act.status || 'planned',
        estimatedCost: act.estimatedCost || 0,
        location: act.placeId
          ? {
              name: act.placeId.name,
              coordinates: act.placeId.location?.coordinates || [77.2, 28.6],
              category: act.placeId.category
            }
          : (act.locationDetails || { name: act.title })
      });
    }

    // 2. Process Transit Transitions
    for (const trans of day.transitions || []) {
      const dep = new Date(trans.departureTime);
      const arr = new Date(trans.arrivalTime);

      timelineItems.push({
        id: `trans_${trans.transitionId || trans._id}`,
        entityId: (trans.transitionId || trans._id).toString(),
        type: 'transit',
        title: `Transit: ${trans.fromLocation?.name || 'Origin'} → ${trans.toLocation?.name || 'Destination'}`,
        startTime: dep,
        endTime: arr,
        durationMinutes: trans.durationMinutes,
        distanceMeters: trans.distanceMeters,
        from: trans.fromLocation,
        to: trans.toLocation,
        isOvernight: Boolean(trans.isOvernight),
        arrivalDayNumber: trans.arrivalDayNumber || day.dayNumber,
        selectedCategory: trans.selectedCategory || 'best_overall',
        selectedRoute: trans.selectedRoute,
        alternativeCategories: Object.keys(trans.alternativeRoutes || {}),
        isLocked: Boolean(trans.isLocked),
        bookingStatus: trans.bookingStatus || 'unbooked'
      });
    }

    // 3. Process Accommodations
    for (const acc of day.accommodations || []) {
      const [checkInH, checkInM] = (acc.checkInTime || '14:00').split(':').map(Number);
      const checkInDate = new Date(calendarDate);
      checkInDate.setHours(checkInH, checkInM, 0, 0);

      timelineItems.push({
        id: `acc_${acc.accommodationId || acc._id}`,
        entityId: (acc.accommodationId || acc._id).toString(),
        type: 'accommodation',
        title: `Hotel Check-in: ${acc.name || 'Accommodated Stay'}`,
        startTime: checkInDate,
        endTime: new Date(checkInDate.getTime() + 30 * 60 * 1000), // 30m check-in buffer
        checkInTime: acc.checkInTime,
        checkOutTime: acc.checkOutTime,
        location: acc.location,
        isLocked: Boolean(acc.isLocked),
        bookingReference: acc.bookingReference || ''
      });
    }

    // Sort timeline chronologically
    timelineItems.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // 4. Run Conflict Detection
    const conflicts = this.detectConflicts(day, activities, timelineItems, trip);
    day.conflicts = conflicts;
    day.hasConflicts = conflicts.length > 0;
    await day.save();

    return {
      itineraryDayId: day._id.toString(),
      tripId: trip._id.toString(),
      dayNumber: day.dayNumber,
      calendarDate: dateStr,
      timeline: timelineItems,
      hasConflicts: day.hasConflicts,
      conflicts: day.conflicts,
      travelDistanceKm: day.travelDistanceKm,
      travelDurationMinutes: day.travelDurationMinutes
    };
  }

  /**
   * Deterministic conflict detection evaluating 7 conflict types.
   */
  static detectConflicts(day, activities, timelineItems, trip) {
    const conflicts = [];

    // Helper to format ISO time to HH:MM
    const toHHMM = (d) => {
      const date = new Date(d);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const acts = timelineItems.filter((i) => i.type === 'activity');
    const transits = timelineItems.filter((i) => i.type === 'transit');
    const accommodations = timelineItems.filter((i) => i.type === 'accommodation');

    // Conflict 1: OVERLAPPING_ACTIVITIES
    for (let i = 0; i < acts.length; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        const a1 = acts[i];
        const a2 = acts[j];

        if (a1.startTime < a2.endTime && a2.startTime < a1.endTime) {
          conflicts.push({
            conflictId: `conf_ovl_${a1.entityId}_${a2.entityId}`,
            conflictType: 'OVERLAPPING_ACTIVITIES',
            severity: 'error',
            message: `Activities '${a1.title}' (${toHHMM(a1.startTime)} - ${toHHMM(a1.endTime)}) and '${a2.title}' (${toHHMM(a2.startTime)} - ${toHHMM(a2.endTime)}) overlap in time.`,
            affectedEntityIds: [a1.entityId, a2.entityId],
            suggestedAction: `Reschedule '${a2.title}' to start after ${toHHMM(a1.endTime)} or shorten '${a1.title}'.`
          });
        }
      }
    }

    // Conflict 2: ACTIVITY_DURING_TRANSIT
    for (const act of acts) {
      for (const tr of transits) {
        if (
          (act.startTime >= tr.startTime && act.startTime < tr.endTime) ||
          (act.endTime > tr.startTime && act.endTime <= tr.endTime) ||
          (act.startTime <= tr.startTime && act.endTime >= tr.endTime)
        ) {
          conflicts.push({
            conflictId: `conf_tr_act_${act.entityId}_${tr.entityId}`,
            conflictType: 'ACTIVITY_DURING_TRANSIT',
            severity: 'error',
            message: `Activity '${act.title}' (${toHHMM(act.startTime)} - ${toHHMM(act.endTime)}) is scheduled during transit from ${tr.from?.name || 'Origin'} to ${tr.to?.name || 'Destination'} (${toHHMM(tr.startTime)} - ${toHHMM(tr.endTime)}).`,
            affectedEntityIds: [act.entityId, tr.entityId],
            suggestedAction: `Move '${act.title}' to after transit arrival at ${toHHMM(tr.endTime)}.`
          });
        }
      }
    }

    // Conflict 4: INSUFFICIENT_TRANSFER_BUFFER
    // Check consecutive transits or transit-to-activity buffer
    for (const tr of transits) {
      // Check intermediate legs inside selectedRoute
      if (tr.selectedRoute && Array.isArray(tr.selectedRoute.legs) && tr.selectedRoute.legs.length > 1) {
        const legs = tr.selectedRoute.legs;
        for (let k = 0; k < legs.length - 1; k++) {
          const l1 = legs[k];
          const l2 = legs[k + 1];
          const l1Arr = new Date(l1.arrivalTime).getTime();
          const l2Dep = new Date(l2.departureTime).getTime();
          const bufferMins = (l2Dep - l1Arr) / (60 * 1000);

          // Flight transfer requires min 45m, rail min 20m, others min 10m
          const minBuffer = l2.mode === 'flight' || l1.mode === 'flight' ? 45 : (l2.mode === 'train' ? 20 : 10);
          if (bufferMins < minBuffer) {
            conflicts.push({
              conflictId: `conf_buf_${tr.entityId}_${k}`,
              conflictType: 'INSUFFICIENT_TRANSFER_BUFFER',
              severity: 'error',
              message: `Transfer buffer between ${l1.mode} and ${l2.mode} is ${Math.round(bufferMins)}m, which is below the minimum required ${minBuffer}m.`,
              affectedEntityIds: [tr.entityId],
              suggestedAction: `Select an alternative route with a larger connection window.`
            });
          }
        }
      }

      // Check buffer from transit arrival to the immediately following activity
      const nextAct = acts.find((a) => a.startTime >= tr.endTime);
      if (nextAct) {
        const bufferToAct = (new Date(nextAct.startTime).getTime() - new Date(tr.endTime).getTime()) / (60 * 1000);
        if (bufferToAct < 10) {
          conflicts.push({
            conflictId: `conf_buf_act_${tr.entityId}_${nextAct.entityId}`,
            conflictType: 'INSUFFICIENT_TRANSFER_BUFFER',
            severity: 'warning',
            message: `Only ${Math.round(bufferToAct)}m buffer between transit arrival (${toHHMM(tr.endTime)}) and next activity '${nextAct.title}' (${toHHMM(nextAct.startTime)}). Recommended: >= 15m.`,
            affectedEntityIds: [tr.entityId, nextAct.entityId],
            suggestedAction: `Add buffer by starting '${nextAct.title}' 15 minutes later.`
          });
        }
      }
    }

    // Conflict 5: ARRIVAL_AFTER_ACTIVITY_START
    // If a long-distance or primary transit arrives at destination after an activity has already started
    for (const tr of transits) {
      for (const act of acts) {
        // If the transit is taking traveler to the activity location or city, but arrives after activity start
        if (tr.startTime < act.startTime && tr.endTime > act.startTime) {
          conflicts.push({
            conflictId: `conf_arr_after_${tr.entityId}_${act.entityId}`,
            conflictType: 'ARRIVAL_AFTER_ACTIVITY_START',
            severity: 'error',
            message: `Transit arrives at ${toHHMM(tr.endTime)}, which is after activity '${act.title}' begins at ${toHHMM(act.startTime)}.`,
            affectedEntityIds: [tr.entityId, act.entityId],
            suggestedAction: `Reschedule '${act.title}' or choose an earlier departure transit option.`
          });
        }
      }
    }

    // Conflict 6: ACCOMMODATION_CONFLICT
    for (const acc of accommodations) {
      // Check if traveler arrives after accommodation check-in deadline
      for (const tr of transits) {
        if (tr.endTime > acc.startTime) {
          // If check-in is scheduled before transit arrival
          conflicts.push({
            conflictId: `conf_acc_${acc.entityId}_${tr.entityId}`,
            conflictType: 'ACCOMMODATION_CONFLICT',
            severity: 'warning',
            message: `Hotel check-in at ${toHHMM(acc.startTime)} occurs before transit arrival at ${toHHMM(tr.endTime)}.`,
            affectedEntityIds: [acc.entityId, tr.entityId],
            suggestedAction: `Reschedule hotel check-in after transit arrival at ${toHHMM(tr.endTime)}.`
          });
        }
      }

      // Check opening hours / check-in window (e.g. check-in desk closure)
      const [ciH] = (acc.checkInTime || '14:00').split(':').map(Number);
      if (ciH > 22 || ciH < 6) {
        conflicts.push({
          conflictId: `conf_acc_late_${acc.entityId}`,
          conflictType: 'ACCOMMODATION_CONFLICT',
          severity: 'warning',
          message: `Check-in time ${acc.checkInTime} is outside standard hotel desk operating hours (06:00 - 22:00).`,
          affectedEntityIds: [acc.entityId],
          suggestedAction: `Request late check-in with hotel or adjust arrival schedule.`
        });
      }
    }

    // Conflict 7: DAY_BOUNDARY_VIOLATION
    for (const item of timelineItems) {
      if (item.type === 'activity') {
        const itemEnd = new Date(item.endTime);
        const calDate = new Date(day.calendarDate);
        // If non-overnight activity extends past midnight into next day
        if (itemEnd.getDate() !== calDate.getDate() && itemEnd.getHours() > 0) {
          conflicts.push({
            conflictId: `conf_bnd_${item.entityId}`,
            conflictType: 'DAY_BOUNDARY_VIOLATION',
            severity: 'warning',
            message: `Activity '${item.title}' extends past midnight into the next day (${toHHMM(item.endTime)}).`,
            affectedEntityIds: [item.entityId],
            suggestedAction: `End activity before 23:59 or split across consecutive days.`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Dynamically recalculates timeline schedules downstream from a given day.
   * Preserves user-locked activities and transitions (`isLocked === true`),
   * shifts flexible items forward where feasible, and logs an audit trail in MongoDB.
   *
   * @param {string} tripId
   * @param {number} [fromDayNumber=1]
   * @param {Object} [options]
   * @param {string} [userId]
   * @returns {Promise<Object>} Recalculation result summary
   */
  static async recalculateSchedule(tripId, fromDayNumber = 1, options = {}, userId = null) {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      const error = new Error('Trip not found');
      error.statusCode = 404;
      throw error;
    }

    if (userId) {
      await ItineraryService.verifyTripEditAccess(tripId, userId);
    }

    const affectedDays = await ItineraryDay.find({
      tripId,
      dayNumber: { $gte: fromDayNumber }
    }).sort({ dayNumber: 1 });

    const affectedDayNumbers = affectedDays.map((d) => d.dayNumber);
    let shiftedCount = 0;
    let lockedCount = 0;

    for (const day of affectedDays) {
      const activities = await Activity.find({ itineraryDayId: day._id }).sort({ sequence: 1 });
      const transitions = day.transitions || [];

      // For every activity, check if transit or previous activity requires a shift
      let currentPointer = new Date(day.calendarDate);
      currentPointer.setHours(9, 0, 0, 0); // Day default start 09:00

      for (let i = 0; i < activities.length; i++) {
        const act = activities[i];

        if (act.isLocked) {
          lockedCount++;
          // Locked activity acts as an immovable wall
          const [actEndH, actEndM] = (act.endTime || '11:00').split(':').map(Number);
          const lockedEnd = new Date(day.calendarDate);
          lockedEnd.setHours(actEndH, actEndM, 0, 0);
          if (lockedEnd > currentPointer) {
            currentPointer = lockedEnd;
          }
          continue;
        }

        // Check if preceding transit ends after current activity's startTime
        const precedingTransit = transitions.find(
          (t) => t.toId?.toString() === act._id.toString() ||
                 (new Date(t.departureTime) < new Date(act.startTime) && new Date(t.arrivalTime) > currentPointer)
        );

        let neededStart = new Date(currentPointer);
        if (precedingTransit && new Date(precedingTransit.arrivalTime) > neededStart) {
          // Add 15 min buffer after transit arrival
          neededStart = new Date(new Date(precedingTransit.arrivalTime).getTime() + 15 * 60 * 1000);
        }

        const [currH, currM] = (act.startTime || '09:00').split(':').map(Number);
        const scheduledStart = new Date(day.calendarDate);
        scheduledStart.setHours(currH, currM, 0, 0);

        if (neededStart > scheduledStart) {
          // Flexible activity can be shifted forward!
          const duration = act.durationMinutes || 60;
          const newStartH = String(neededStart.getHours()).padStart(2, '0');
          const newStartM = String(neededStart.getMinutes()).padStart(2, '0');

          const newEnd = new Date(neededStart.getTime() + duration * 60 * 1000);
          const newEndH = String(newEnd.getHours()).padStart(2, '0');
          const newEndM = String(newEnd.getMinutes()).padStart(2, '0');

          act.startTime = `${newStartH}:${newStartM}`;
          act.endTime = `${newEndH}:${newEndM}`;
          await act.save();
          shiftedCount++;

          currentPointer = newEnd;
        } else {
          const [endH, endM] = (act.endTime || '10:30').split(':').map(Number);
          const actEnd = new Date(day.calendarDate);
          actEnd.setHours(endH, endM, 0, 0);
          if (actEnd > currentPointer) {
            currentPointer = actEnd;
          }
        }
      }

      // Re-run conflict detection on the modified day
      await this.buildDayTimeline(day._id, userId);
    }

    // Record entry in Trip audit trail
    trip.auditTrail.push({
      timestamp: new Date(),
      actorId: userId || trip.ownerId,
      action: 'recalculate_schedule',
      affectedDayNumbers,
      summary: `Recalculated timeline schedule for days [${affectedDayNumbers.join(', ')}]. Shifted ${shiftedCount} flexible activities, preserved ${lockedCount} locked items.`,
      metadata: { shiftedCount, lockedCount, options }
    });
    await trip.save();

    return {
      success: true,
      tripId: trip._id.toString(),
      fromDayNumber,
      affectedDayNumbers,
      shiftedCount,
      lockedCount,
      message: `Successfully recalculated schedule for ${affectedDays.length} day(s).`
    };
  }
}
