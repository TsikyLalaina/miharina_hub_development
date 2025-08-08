import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({ storage });
