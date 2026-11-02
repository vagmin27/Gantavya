import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/gantavya',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_super_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_key_super_secure',
  INTELLIGENCE_SERVICE_URL: process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:8000/api/v1',
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || 'dev_internal_service_key',
  isProduction: process.env.NODE_ENV === 'production'
};

