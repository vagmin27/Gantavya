import { ApiResponse } from '../../utils/api-response.js';
import { getDatabaseStatus } from '../../config/db.js';
import { env } from '../../config/env.js';

export class HealthController {
  static getHealth(req, res) {
    const dbStatus = getDatabaseStatus();

    const healthData = {
      service: 'gantavya-backend',
      status: 'ok',
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      database: dbStatus
    };

    return ApiResponse.success(res, healthData, 'Backend service is healthy', 200);
  }
}

