import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

interface QsData {
  rank: number;
  status: string;
}

// Cached map: normalized university name → QS data (rank + status)
let qsRankingMap: Map<string, QsData> | null = null;

// Use process.cwd() so the path works in both development (ts-node) and production (compiled dist/)
// process.cwd() always points to the backend root directory when the server starts
const QS_FILE_PATH = path.join(process.cwd(), 'data', 'qs-world-university-ranking.xlsx');

/**
 * Normalize a university name for fuzzy matching:
 * lowercase, trim, remove extra spaces, strip common suffixes/punctuation
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')         // collapse multiple spaces
    .replace(/[()]/g, '')          // remove parentheses
    .replace(/[''`]/g, "'")        // normalize apostrophes
    .replace(/[""]/g, '"');        // normalize quotes
}

/**
 * Parse a QS rank value that may be a number, "=696", or "701-710"
 * Returns the numeric rank or null if unparseable
 */
function parseRank(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  
  // Handle "=696" format (shared rank)
  if (str.startsWith('=')) {
    const num = parseInt(str.substring(1), 10);
    return isNaN(num) ? null : num;
  }
  
  // Handle "701-710" format (range) → take first number
  if (str.includes('-')) {
    const num = parseInt(str.split('-')[0], 10);
    return isNaN(num) ? null : num;
  }
  
  // Handle plain number strings
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

/**
 * Load (or reload) the QS ranking data from the Excel file into the cache.
 */
function loadQsRankings(): void {
  if (!fs.existsSync(QS_FILE_PATH)) {
    console.warn('QS ranking file not found at:', QS_FILE_PATH);
    qsRankingMap = new Map();
    return;
  }

  const buffer = fs.readFileSync(QS_FILE_PATH);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 0 });

  // Row 0 = merged category headers, Row 1 = actual column names, Row 2+ = data
  // After sheet_to_json: index 0 = merged row, index 1 = header labels
  // Data starts at index 2
  // Columns: __EMPTY = 2026 Rank, __EMPTY_2 = University Name

  const map = new Map<string, QsData>();

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const name = row['__EMPTY_2'];
    const rankValue = row['__EMPTY'];
    const status = row['__EMPTY_7'] || '';

    if (!name || typeof name !== 'string') continue;

    const rank = parseRank(rankValue);
    if (rank === null) continue;

    map.set(normalizeName(name), { rank, status: String(status).trim() });
  }

  qsRankingMap = map;
  console.log(`Loaded ${map.size} QS university rankings`);
}

/**
 * Clear the cached rankings (call after uploading a new QS Excel file)
 */
export function clearQsRankingCache(): void {
  qsRankingMap = null;
}

/**
 * Look up the QS data (ranking + status) for a university name.
 * Returns { rank, status } or null if not found.
 */
export function getQsData(universityName: string): QsData | null {
  if (!universityName) return null;

  // Lazy-load on first call
  if (qsRankingMap === null) {
    loadQsRankings();
  }

  const normalized = normalizeName(universityName);
  
  // Exact match
  if (qsRankingMap!.has(normalized)) {
    return qsRankingMap!.get(normalized)!;
  }

  // Substring match: check if any stored name contains or is contained in the query
  for (const [storedName, data] of qsRankingMap!) {
    if (storedName.includes(normalized) || normalized.includes(storedName)) {
      return data;
    }
  }

  return null;
}

/**
 * Look up the QS ranking for a university name.
 * Returns the numeric rank or null if not found.
 */
export function getQsRanking(universityName: string): number | null {
  const data = getQsData(universityName);
  return data ? data.rank : null;
}
