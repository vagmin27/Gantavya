import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/gantavya',

  // Authentication & Secrets
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_super_secure_and_long_enough_for_dev',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'dev_jwt_access_secret_key_super_secure_32_chars',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_super_secure_32_chars',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_key_super_secure',

  // Cookie Settings
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',

  // Intelligence Service Communication
  INTELLIGENCE_SERVICE_URL: process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:8000/api/v1',
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_service_key',

  // Transportation Providers
  HERE_API_KEY: process.env.HERE_API_KEY || '',
  HERE_ROUTING_BASE_URL: process.env.HERE_ROUTING_BASE_URL || 'https://router.hereapi.com/v8',
  AMADEUS_CLIENT_ID: process.env.AMADEUS_CLIENT_ID || '',
  AMADEUS_CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET || '',
  AMADEUS_HOSTNAME: process.env.AMADEUS_HOSTNAME || 'test.api.amadeus.com',

  isProduction: process.env.NODE_ENV === 'production'
};
