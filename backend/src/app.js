import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import profilesRoutes from './modules/profiles/profile.routes.js';
import destinationsRoutes from './modules/destinations/destination.routes.js';
import placesRoutes from './modules/places/place.routes.js';
import tripsRoutes from './modules/trips/trip.routes.js';
import itinerariesRoutes from './modules/itineraries/itinerary.routes.js';
import activitiesRoutes from './modules/activities/activity.routes.js';
import transportationRoutes from './modules/transportation/transportation.routes.js';
import { swaggerDocsRouter, swaggerUiHandler } from './docs/swagger.js';
import { notFoundHandler, globalErrorHandler } from './middleware/error.middleware.js';

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
  })
);
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Interactive API Documentation
app.use('/api/docs', swaggerDocsRouter, swaggerUiHandler);

// API v1 Domain Module Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/profiles', profilesRoutes);
app.use('/api/v1/destinations', destinationsRoutes);
app.use('/api/v1/places', placesRoutes);
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/v1/itineraries', itinerariesRoutes);
app.use('/api/v1/activities', activitiesRoutes);
app.use('/api/v1/transportation', transportationRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
