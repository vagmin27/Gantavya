import mongoose from 'mongoose';
import { env } from './env.js';

let eventListenersRegistered = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!eventListenersRegistered) {
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB error: ${err.message}`);
    });
    eventListenersRegistered = true;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    if (env.isProduction) {
      process.exit(1);
    }
  }
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}


