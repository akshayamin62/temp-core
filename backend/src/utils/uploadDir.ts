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
export const ensureDir = (dirPath: string): void => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create directory ${dirPath}:`, err);
  }
};
