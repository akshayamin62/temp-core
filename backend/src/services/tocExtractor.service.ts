import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Lazy-load pdf-parse to avoid crashing in serverless environments
// (pdf-parse depends on @napi-rs/canvas + DOMMatrix which aren't available on Vercel)
let pdfParse: any = null;
const getPdfParse = () => {
  if (!pdfParse) {
    try {
      pdfParse = require('pdf-parse');
    } catch (err) {
      console.warn('pdf-parse not available in this environment:', err);
    }
  }
  return pdfParse;
};

export interface ExtractedTask {
  title: string;
  page?: number;
}

/**
 * Extract table of contents/headings from a Word document
 */
async function extractWordTOC(filePath: string): Promise<ExtractedTask[]> {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    // Extract headings from HTML (h1, h2, h3, h4)
    const headingRegex = /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi;
    const tasks: ExtractedTask[] = [];
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, '').trim(); // Remove any inner HTML tags
      if (title) {
        tasks.push({ title });
      }
    }

    // If no headings found, create a single default task
    if (tasks.length === 0) {
      tasks.push({ title: 'Complete Document Review' });
    }

    return tasks;
  } catch (error) {
    console.error('Error extracting Word TOC:', error);
    return [{ title: 'Complete Document Review' }];
  }
}

/**
 * Extract table of contents/sections from a PDF document
 */
async function extractPDFTOC(filePath: string): Promise<ExtractedTask[]> {
  try {
    const parser = getPdfParse();
    if (!parser) {
      console.warn('pdf-parse unavailable, returning default task');
      return [{ title: 'Complete Document Review' }];
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await parser(dataBuffer);

    const tasks: ExtractedTask[] = [];
    const lines = data.text.split('\n');

    // Simple heuristic: Look for numbered sections, chapter headings, or ALL CAPS lines
    const tocPatterns = [
      /^(\d+\.?\s+[A-Z][^\n]{5,80})$/,           // "1. Introduction" or "1 Introduction"
      /^(Chapter\s+\d+[:\s]+[A-Z][^\n]{5,80})$/i, // "Chapter 1: Title"
      /^([A-Z][A-Z\s]{5,80})$/,                   // "INTRODUCTION"
      /^([IVX]+\.\s+[A-Z][^\n]{5,80})$/          // "I. Introduction" (Roman numerals)
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const pattern of tocPatterns) {
        if (pattern.test(line)) {
          tasks.push({ title: line });
          break;
        }
      }
    }

    // Remove duplicates
    const uniqueTasks = Array.from(new Set(tasks.map(t => t.title))).map(title => ({ title }));

    // If no structured content found, create a single default task
    if (uniqueTasks.length === 0) {
      return [{ title: 'Complete Document Review' }];
    }

    // Limit to first 20 tasks to avoid overwhelming
    return uniqueTasks.slice(0, 20);
  } catch (error) {
    console.error('Error extracting PDF TOC:', error);
    return [{ title: 'Complete Document Review' }];
  }
}

/**
 * Extract table of contents from a document (auto-detects format)
 */
export async function extractTOC(filePath: string): Promise<ExtractedTask[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractPDFTOC(filePath);
  } else if (ext === '.doc' || ext === '.docx') {
    return extractWordTOC(filePath);
  } else {
    // Unsupported format
    return [{ title: 'Complete Document Review' }];
  }
}
