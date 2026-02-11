import { PointerNo } from '../types/PointerNo';
interface ExcelRow {
    title: string;
    description: string;
    tags: string;
}
export declare const getPointerNoFromFilename: (filename: string) => PointerNo | null;
export declare const parseExcelFile: (buffer: Buffer) => ExcelRow[];
export declare const validateExcelRow: (row: any) => boolean;
export declare const saveAgentSuggestions: (rows: ExcelRow[], pointerNo: PointerNo, overwrite?: boolean) => Promise<{
    created: number;
    skipped: number;
    updated: number;
}>;
export {};
//# sourceMappingURL=excelParser.service.d.ts.map