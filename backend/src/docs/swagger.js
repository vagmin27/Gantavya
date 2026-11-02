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
        description: 'Returns operational status, uptime, and database connectivity.',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Service is operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Backend service is healthy' },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        uptime: { type: 'number', example: 12.34 },
                        environment: { type: 'string', example: 'development' },
                        database: { type: 'string', example: 'connected' }
                      }
                    },
                    timestamp: { type: 'string', example: '2026-11-02T18:00:00.000Z' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerDocsRouter = swaggerUi.serve;
export const swaggerUiHandler = swaggerUi.setup(swaggerSpec);

