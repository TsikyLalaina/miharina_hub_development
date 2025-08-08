import { Request, Response } from 'express';

// Controller for managing success stories
export class SuccessStoryController {
    public async getStories(_req: Request, res: Response): Promise<void> {
        res.send('List of success stories');
    }

    public async createStory(_req: Request, res: Response): Promise<void> {
        res.send('Create story logic');
    }
}
