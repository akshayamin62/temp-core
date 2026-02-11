"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const grammarCheck_service_1 = __importDefault(require("../services/grammarCheck.service"));
const router = (0, express_1.Router)();
router.post('/check', async (req, res) => {
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
        const errors = await grammarCheck_service_1.default.checkText(text, language);
        return res.status(200).json({
            success: true,
            data: {
                errors,
            },
        });
    }
    catch (error) {
        console.error('Grammar check endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check grammar',
        });
    }
});
exports.default = router;
//# sourceMappingURL=grammarCheck.routes.js.map