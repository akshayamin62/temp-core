import { Router, Request, Response } from 'express';
import grammarCheckService from '../services/grammarCheck.service';

const router = Router();

router.post('/check', async (req: Request, res: Response) => {
    try {
        const { text, language = 'en-US' } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Text is required and must be a string',
            });
        }

        if (text.trim().length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    errors: [],
                },
            });
        }

        const errors = await grammarCheckService.checkText(text, language);

        return res.status(200).json({
            success: true,
            data: {
                errors,
            },
        });
    } catch (error: any) {
        console.error('Grammar check endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check grammar',
        });
    }
});

export default router;
