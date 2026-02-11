declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [key: string]: WorkSheet };
  }

  export interface WorkSheet {
    [key: string]: any;
  }

  export interface ParsingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    cellDates?: boolean;
    cellNF?: boolean;
    cellFormula?: boolean;
    cellHTML?: boolean;
    cellText?: boolean;
    sheetStubs?: boolean;
    sheetRows?: number;
    bookDeps?: boolean;
    bookFiles?: boolean;
    bookProps?: boolean;
    bookSheets?: boolean;
    bookVBA?: boolean;
    raw?: boolean;
  }

  export function read(data: any, opts?: ParsingOptions): WorkBook;
  export function utils(): any;
  export namespace utils {
    export function sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[];
    export function book_new(): WorkBook;
    export function book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name?: string): void;
    export function aoa_to_sheet(data: any[][]): WorkSheet;
  }
}

