"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class GrammarCheckService {
    constructor() {
        this.languageToolUrl = 'https://api.languagetool.org/v2/check';
    }
    async checkText(text, language = 'en-US') {
        try {
            const response = await axios_1.default.post(this.languageToolUrl, null, {
                params: {
                    text,
                    language,
                },
            });
            const errors = response.data.matches || [];
            return errors.map((error) => {
                const type = this.classifyError(error.rule.issueType);
                return {
                    offset: error.offset,
                    length: error.length,
                    message: error.message,
                    shortMessage: error.shortMessage,
                    rule: {
                        id: error.rule.id,
                        description: error.rule.description,
                    },
                    type,
                };
            });
        }
        catch (error) {
            console.error('Grammar check error:', error);
            return [];
        }
    }
    classifyError(issueType) {
        if (!issueType)
            return 'GRAMMAR';
        const lowerType = issueType.toLowerCase();
        if (lowerType.includes('misspelling') || lowerType.includes('spelling')) {
            return 'SPELLING';
        }
        if (lowerType.includes('grammar') ||
            lowerType.includes('style') ||
            lowerType.includes('whitespace') ||
            lowerType.includes('uncategorized') ||
            lowerType.includes('typography') ||
            lowerType.includes('punctuation')) {
            return 'GRAMMAR';
        }
        return 'GRAMMAR';
    }
}
exports.default = new GrammarCheckService();
//# sourceMappingURL=grammarCheck.service.js.map