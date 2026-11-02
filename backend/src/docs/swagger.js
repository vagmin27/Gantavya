import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Gantavya API',
    version: '1.0.0',
    description: 'Modular Monolith API Documentation for Gantavya Travel Intelligence Platform'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Root'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Service Health Check',
        tags: ['Health'],
        responses: {
          200: { description: 'Backend service is healthy' }
        }
      }
    },
    '/profiles/{userId}': {
      get: {
        summary: 'Get Traveller Profile',
        tags: ['Profiles'],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Profile retrieved successfully' },
          404: { description: 'Profile not found' }
        }
      },
      put: {
        summary: 'Update Traveller Profile',
        tags: ['Profiles'],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  travelInterests: { type: 'array', items: { type: 'string' } },
                  preferredTravelStyles: { type: 'array', items: { type: 'string' } },
                  accommodationPreferences: { type: 'array', items: { type: 'string' } },
                  foodPreferences: { type: 'array', items: { type: 'string' } },
                  preferredTransportation: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/destinations': {
      get: {
        summary: 'List / Discover Destinations',
        tags: ['Destinations'],
        parameters: [
          { name: 'country', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          200: { description: 'Destinations retrieved successfully' }
        }
      },
      post: {
        summary: 'Create Destination',
        tags: ['Destinations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'country', 'description', 'location'],
                properties: {
                  name: { type: 'string', example: 'Pokhara' },
                  country: { type: 'string', example: 'Nepal' },
                  description: { type: 'string' },
                  location: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', example: 'Point' },
                      coordinates: { type: 'array', items: { type: 'number' }, example: [83.9856, 28.2096] }
                    }
                  },
                  categories: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Destination created successfully' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/places': {
      get: {
        summary: 'List / Discover Places',
        tags: ['Places'],
        parameters: [
          { name: 'destinationId', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'priceTier', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Places retrieved successfully' }
        }
      },
      post: {
        summary: 'Create Place',
        tags: ['Places'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'destinationId', 'category', 'location', 'estimatedVisitDuration'],
                properties: {
                  name: { type: 'string', example: 'Phewa Lake' },
                  destinationId: { type: 'string' },
                  category: { type: 'string', example: 'nature_spot' },
                  location: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', example: 'Point' },
                      coordinates: { type: 'array', items: { type: 'number' }, example: [83.9576, 28.2116] }
                    }
                  },
                  estimatedVisitDuration: { type: 'integer', example: 120 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Place created successfully' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/trips': {
      get: {
        summary: 'List Trips for User',
        tags: ['Trips'],
        parameters: [
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Trips retrieved successfully' }
        }
      },
      post: {
        summary: 'Create Trip',
        tags: ['Trips'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'ownerId', 'destinationId', 'startDate', 'endDate'],
                properties: {
                  title: { type: 'string', example: 'Annapurna Circuit Trek' },
                  ownerId: { type: 'string' },
                  destinationId: { type: 'string' },
                  startDate: { type: 'string', format: 'date', example: '2026-10-01' },
                  endDate: { type: 'string', format: 'date', example: '2026-10-14' },
                  budget: {
                    type: 'object',
                    properties: {
                      currency: { type: 'string', default: 'NPR' },
                      targetAmount: { type: 'number', example: 75000 }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Trip created successfully' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/trips/{id}/participants': {
      post: {
        summary: 'Add Participant to Trip',
        tags: ['Trips'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string' },
                  role: { type: 'string', enum: ['organizer', 'editor', 'viewer'], default: 'viewer' },
                  invitationStatus: { type: 'string', enum: ['pending', 'accepted'], default: 'pending' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Participant added successfully' },
          400: { description: 'Duplicate participant or invalid operation' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/itineraries': {
      get: {
        summary: 'List Itinerary Days for Trip',
        tags: ['Itineraries'],
        parameters: [
          { name: 'tripId', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Itinerary days retrieved successfully' }
        }
      },
      post: {
        summary: 'Create Itinerary Day',
        tags: ['Itineraries'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tripId', 'dayNumber', 'calendarDate'],
                properties: {
                  tripId: { type: 'string' },
                  dayNumber: { type: 'integer', example: 1 },
                  calendarDate: { type: 'string', format: 'date', example: '2026-10-01' },
                  title: { type: 'string', example: 'Arrival and Lakeside Exploration' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Itinerary day created successfully' },
          409: { description: 'Day number already exists for this trip' },
          422: { description: 'Validation error' }
        }
      }
    },
    '/activities': {
      get: {
        summary: 'List Activities for Itinerary Day',
        tags: ['Activities'],
        parameters: [
          { name: 'itineraryDayId', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Activities retrieved successfully' }
        }
      },
      post: {
        summary: 'Create Activity',
        tags: ['Activities'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itineraryDayId', 'tripId', 'placeId', 'title', 'durationMinutes', 'sequence'],
                properties: {
                  itineraryDayId: { type: 'string' },
                  tripId: { type: 'string' },
                  placeId: { type: 'string' },
                  title: { type: 'string', example: 'Boating at Phewa Lake' },
                  startTime: { type: 'string', example: '09:00' },
                  endTime: { type: 'string', example: '11:00' },
                  durationMinutes: { type: 'integer', example: 120 },
                  sequence: { type: 'integer', example: 1 },
                  estimatedCost: { type: 'number', example: 1500 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Activity created successfully' },
          409: { description: 'Sequence position already exists for this day' },
          422: { description: 'Validation error' }
        }
      }
    }
  }
};

export const swaggerDocsRouter = swaggerUi.serve;
export const swaggerUiHandler = swaggerUi.setup(swaggerSpec);
