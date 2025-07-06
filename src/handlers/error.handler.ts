import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

/**
 * Custom Error class that extends the built-in Error class
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose CastError
 */
const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationErrorDB = (err: any): AppError => {
  const errors = Object.values(err.errors).map((val: any) => val.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Keys Error
 */
const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Error
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Send error response in development environment
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  const errorResponse: ErrorResponse = {
    status: err.status,
    statusCode: err.statusCode,
    message: err.message,
    stack: err.stack
  };

  res.status(err.statusCode).json(errorResponse);
};

/**
 * Send error response in production environment
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Only send operational errors to client
  if (err.isOperational) {
    const errorResponse: ErrorResponse = {
      status: err.status,
      statusCode: err.statusCode,
      message: err.message
    };

    res.status(err.statusCode).json(errorResponse);
  } else {
    // Log error for developers
    console.error('ERROR 💥', err);

    // Send generic message to client
    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: 500,
      message: 'Something went wrong'
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Different error handling based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle different types of errors
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
