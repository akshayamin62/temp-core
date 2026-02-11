export interface ExtractedTask {
    title: string;
    page?: number;
}
/**
 * Extract table of contents from a document (auto-detects format)
 */
export declare function extractTOC(filePath: string): Promise<ExtractedTask[]>;
//# sourceMappingURL=tocExtractor.service.d.ts.map