import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Define a custom error type that includes status property
interface HttpError extends Error {
  status?: number;
}

// Enhanced error handling middleware
export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err);

  // Handle Multer (file upload) errors explicitly
  if (err instanceof multer.MulterError) {
    const code = err.code;
    const message = code === 'LIMIT_FILE_SIZE'
      ? 'File too large'
      : err.message || 'Upload error';
    res.status(400).json({ error: message, code });
    return;
  }

  // General error fallback
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env['NODE_ENV'] === 'development' ? err.stack : undefined,
  });
}
