import * as XLSX from 'xlsx';
import { PointerNo } from '../types/PointerNo';
import AgentSuggestion from '../models/ivy/AgentSuggestion';

interface ExcelRow {
  title: string;
  description: string;
  tags: string;
}

export const getPointerNoFromFilename = (filename: string): PointerNo | null => {
  const normalizedFilename = filename.trim();
  
  if (normalizedFilename === 'Spike in One area.xlsx') {
    return PointerNo.SpikeInOneArea;
  }
  if (normalizedFilename === 'Leadership & Initiative.xlsx') {
    return PointerNo.LeadershipInitiative;
  }
  if (normalizedFilename === 'Global & Social Impact.xlsx') {
    return PointerNo.GlobalSocialImpact;
  }
  
  return null;
};

export const parseExcelFile = (buffer: Buffer): ExcelRow[] => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file has no sheets');
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file`);
    }
    
    // Parse with header row - XLSX will automatically map column headers to properties
    // Handle various possible column name variations
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      defval: '', // Default value for empty cells
      raw: false, // Convert numbers to strings
    });

    if (!data || data.length === 0) {
      throw new Error('Excel file appears to be empty or has no data rows');
    }

    // Log available column names for debugging
    if (data.length > 0) {
      console.log('Available columns in Excel:', Object.keys(data[0]));
    }

    // Map various possible column names to our expected format
    const mappedData: ExcelRow[] = data
      .map((row: any, _index: number) => {
        // Try to find title column (case-insensitive, handles various names)
        let title = '';
        let description = '';
        let tags = '';

        const rowKeys = Object.keys(row);
        
        // Find title column - prioritize "Action Work Name", ignore "#" column
        // First, try to find "Action Work Name" specifically
        let titleKey = rowKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('action work') && lowerKey.includes('name');
          }
        );
        
        // If not found, try other variations (but exclude "#" column)
        if (!titleKey) {
          titleKey = rowKeys.find(
            (key) => {
              const lowerKey = key.toLowerCase();
              // Explicitly exclude "#" column
              if (lowerKey === '#' || lowerKey.trim() === '#') {
                return false;
              }
              return (
                lowerKey.includes('title') ||
                (lowerKey.includes('name') && !lowerKey.includes('#')) ||
                lowerKey.includes('activity')
              );
            }
          );
        }
        
        if (titleKey) {
          const titleValue = row[titleKey];
          title = titleValue ? titleValue.toString().trim() : '';
        } else if (rowKeys.length > 0) {
          // If no title column found, use first non-# column as title
          const firstNonHashKey = rowKeys.find(key => {
            const lowerKey = key.toLowerCase().trim();
            return lowerKey !== '#' && lowerKey !== '';
          });
          if (firstNonHashKey) {
            const titleValue = row[firstNonHashKey];
            title = titleValue ? titleValue.toString().trim() : '';
          } else if (rowKeys.length > 0) {
            const titleValue = row[rowKeys[0]];
            title = titleValue ? titleValue.toString().trim() : '';
          }
        }

        // Find description column - prioritize "Detailed Action Points"
        let descKey = rowKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('detailed') && lowerKey.includes('action point');
          }
        );
        
        // If not found, try other variations
        if (!descKey) {
          descKey = rowKeys.find(
            (key) => {
              const lowerKey = key.toLowerCase();
              return (
                lowerKey.includes('description') ||
                (lowerKey.includes('detail') && !lowerKey.includes('#')) ||
                lowerKey.includes('action point') ||
                lowerKey.includes('steps')
              );
            }
          );
        }
        
        if (descKey) {
          const descValue = row[descKey];
          description = descValue ? descValue.toString().trim() : '';
        } else if (rowKeys.length > 1) {
          // If no description column found, use second non-# column as description
          const nonHashKeys = rowKeys.filter(key => {
            const lowerKey = key.toLowerCase().trim();
            return lowerKey !== '#' && lowerKey !== '';
          });
          if (nonHashKeys.length > 1) {
            const descValue = row[nonHashKeys[1]];
            description = descValue ? descValue.toString().trim() : '';
          } else if (rowKeys.length > 1) {
            const descValue = row[rowKeys[1]];
            description = descValue ? descValue.toString().trim() : '';
          }
        }

        // Find tags column (optional - if not found, use empty string)
        const tagsKey = rowKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase();
            return (
              lowerKey.includes('tag') ||
              lowerKey.includes('category') ||
              lowerKey.includes('label')
            );
          }
        );
        
        if (tagsKey) {
          tags = row[tagsKey]?.toString().trim() || '';
        }

        return {
          title,
          description,
          tags: tags || '', // Default to empty string if no tags column found
        };
      })
      .filter((row, _index) => {
        // Filter out header rows and empty rows
        const title = row.title?.toLowerCase().trim() || '';
        const headerPatterns = [
          'title',
          'activity',
          'name',
          'item',
          'suggestion',
          'action work name',
          '#',
          'detailed action points',
        ];
        
        // Skip if title matches header patterns (but allow if it's just a number like "#")
        if (title && headerPatterns.some((pattern) => {
          if (pattern === '#') {
            return title === '#' || title.startsWith('# ');
          }
          return title === pattern;
        })) {
          return false;
        }
        
        // Skip if title is empty
        if (!title || title.length === 0) {
          return false;
        }
        
        return true;
      });

    console.log(`Parsed ${mappedData.length} valid rows from Excel file`);
    return mappedData;
  } catch (error: any) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

export const validateExcelRow = (row: any): boolean => {
  // Title and description are required, tags are optional
  return (
    row.title &&
    typeof row.title === 'string' &&
    row.title.trim() !== '' &&
    row.description &&
    typeof row.description === 'string' &&
    row.description.trim() !== ''
    // Tags are optional - if not provided, will default to empty array
  );
};

export const saveAgentSuggestions = async (
  rows: ExcelRow[],
  pointerNo: PointerNo,
  overwrite: boolean = false
): Promise<{ created: number; skipped: number; updated: number }> => {
  let created = 0;
  let skipped = 0;
  let updated = 0;

  // If overwrite is true, delete all existing suggestions for this pointer first
  if (overwrite) {
    const deleteResult = await AgentSuggestion.deleteMany({ pointerNo });
    console.log(`Overwrite mode: Deleted ${deleteResult.deletedCount} existing records for pointer ${pointerNo}`);
  }

  // Track titles we've already processed in this batch to handle duplicates within the Excel file
  const processedTitles = new Set<string>();

  for (const row of rows) {
    if (!validateExcelRow(row)) {
      skipped++;
      continue;
    }

    // Parse tags (comma separated) - tags are optional
    const tagsString = row.tags || '';
    const tags = tagsString
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag !== '');

    const titleTrimmed = row.title.trim();
    const descriptionTrimmed = row.description.trim();

    // Check if we've already processed this title in this batch
    if (processedTitles.has(titleTrimmed)) {
      console.log(`Skipping duplicate title in Excel file: "${titleTrimmed}"`);
      skipped++;
      continue;
    }

    // If overwrite mode, we already deleted all records, so just create new ones
    if (overwrite) {
      await AgentSuggestion.create({
        pointerNo: pointerNo,
        title: titleTrimmed,
        description: descriptionTrimmed,
        tags: tags,
        source: 'EXCEL',
      });
      processedTitles.add(titleTrimmed);
      created++;
      continue;
    }

    // Normal mode: Use upsert to update existing or create new
    const existing = await AgentSuggestion.findOne({
      title: titleTrimmed,
      pointerNo: pointerNo,
    });

    if (existing) {
      // Update existing record
      await AgentSuggestion.updateOne(
        { _id: existing._id },
        {
          description: descriptionTrimmed,
          tags: tags,
          source: 'EXCEL',
        }
      );
      processedTitles.add(titleTrimmed);
      updated++;
    } else {
      // Create new suggestion
      await AgentSuggestion.create({
        pointerNo: pointerNo,
        title: titleTrimmed,
        description: descriptionTrimmed,
        tags: tags,
        source: 'EXCEL',
      });
      processedTitles.add(titleTrimmed);
      created++;
    }
  }

  return { created, skipped, updated };
};

