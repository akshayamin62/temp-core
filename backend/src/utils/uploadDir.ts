import path from 'path';
import fs from 'fs';

/**
 * Get the base upload directory.
 * On Vercel (serverless), the filesystem is read-only except /tmp.
 * Locally, use the project's uploads folder.
 */
export const getUploadBaseDir = (): string => {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return '/tmp/uploads';
  }
  return path.join(process.cwd(), 'uploads');
};

/**
 * Ensure a directory exists, creating it if necessary.
 * Wraps mkdirSync in a try-catch for serverless environments.
 */
/**
 * Validate that a resolved file path stays within the uploads directory.
 * Prevents path traversal attacks (e.g. ../../etc/passwd).
 * Returns the safe resolved path or null if traversal detected.
 */
export const validateFilePath = (filePath: string): string | null => {
  const uploadsBase = path.resolve(getUploadBaseDir());
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadsBase + path.sep) && resolved !== uploadsBase) {
    return null;
  }
  return resolved;
};

export const ensureDir = (dirPath: string): void => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dirPath}:`, err);
  }
};
