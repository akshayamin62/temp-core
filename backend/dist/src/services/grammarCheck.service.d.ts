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
declare class GrammarCheckService {
    private languageToolUrl;
    checkText(text: string, language?: string): Promise<GrammarError[]>;
    private classifyError;
}
declare const _default: GrammarCheckService;
export default _default;
//# sourceMappingURL=grammarCheck.service.d.ts.map