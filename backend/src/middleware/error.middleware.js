import { ApiResponse } from '../utils/api-response.js';

export function notFoundHandler(req, res, next) {
  ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.stack || err.message}`);

  ApiResponse.error(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
}

