import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler, AppError } from './handlers/error.handler';
import routes from './routes';
import Logger from './utils/logger';

// Initialize logger
const logger = new Logger('App');

// Initialize Express application
const app: Application = express();

// Apply global middlewares
app.use(helmet()); // Security HTTP headers
app.use(compression()); // Compress responses
app.use(cors()); // CORS middleware
app.use(express.json({ limit: '10kb' })); // Body parser, reading data from body into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API routes
app.use('/api', routes);

// Handle undefined routes
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(errorHandler);

export default app;
