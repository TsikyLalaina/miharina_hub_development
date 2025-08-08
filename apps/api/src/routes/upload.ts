import { Router, Response } from 'express';
import { upload } from '../middleware/upload';

const router = Router();

// Define routes for file uploads
router.post('/file', upload.single('file'), (_, res: Response) => {
    res.send('File uploaded successfully');
});

export default router;
