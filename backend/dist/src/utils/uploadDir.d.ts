/**
 * Get the base upload directory.
 * On Vercel (serverless), the filesystem is read-only except /tmp.
 * Locally, use the project's uploads folder.
 */
export declare const getUploadBaseDir: () => string;
/**
 * Ensure a directory exists, creating it if necessary.
 * Wraps mkdirSync in a try-catch for serverless environments.
 */
export declare const ensureDir: (dirPath: string) => void;
//# sourceMappingURL=uploadDir.d.ts.map