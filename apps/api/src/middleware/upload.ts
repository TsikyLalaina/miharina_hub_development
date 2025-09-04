import multer from 'multer';
import { config } from '../config/environment';

// Configure multer for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = config.storage.allowedMimeTypes;
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err: any = new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`);
      err.status = 400;
      cb(err);
    }
  }
});
