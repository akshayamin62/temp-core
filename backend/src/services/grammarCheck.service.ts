import axios from 'axios';

export interface GrammarError {
    offset: number;
    length: number;
    message: string;
    shortMessage: string;
    rule: {
        id: string;
        description: string;
    };
    type: 'SPELLING' | 'GRAMMAR';
}

class GrammarCheckService {
    private languageToolUrl = 'https://api.languagetool.org/v2/check';

    async checkText(text: string, language: string = 'en-US'): Promise<GrammarError[]> {
        try {
            const response = await axios.post(
                this.languageToolUrl,
                null,
                {
                    params: {
                        text,
                        language,
                    },
                }
            );

            const errors = response.data.matches || [];
            
            return errors.map((error: any) => {
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
        } catch (error) {
            console.error('Grammar check error:', error);
            return [];
        }
    }

    private classifyError(issueType: string): 'SPELLING' | 'GRAMMAR' {
        if (!issueType) return 'GRAMMAR';
        
        const lowerType = issueType.toLowerCase();
        
        if (lowerType.includes('misspelling') || lowerType.includes('spelling')) {
            return 'SPELLING';
        }
        
        if (
            lowerType.includes('grammar') ||
            lowerType.includes('style') ||
            lowerType.includes('whitespace') ||
            lowerType.includes('uncategorized') ||
            lowerType.includes('typography') ||
            lowerType.includes('punctuation')
        ) {
            return 'GRAMMAR';
        }
        
        return 'GRAMMAR';
    }
}

export default new GrammarCheckService();
