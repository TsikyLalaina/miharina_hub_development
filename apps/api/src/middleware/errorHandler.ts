import { Request, Response, NextFunction } from 'express';

// Define a custom error type that includes status property
interface HttpError extends Error {
  status?: number;
}

// Enhanced error handling middleware
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env['NODE_ENV'] === 'development' ? err.stack : undefined,
  });
}
