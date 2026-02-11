"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = exports.getUploadBaseDir = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Get the base upload directory.
 * On Vercel (serverless), the filesystem is read-only except /tmp.
 * Locally, use the project's uploads folder.
 */
const getUploadBaseDir = () => {
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
        return '/tmp/uploads';
    }
    return path_1.default.join(process.cwd(), 'uploads');
};
exports.getUploadBaseDir = getUploadBaseDir;
/**
 * Ensure a directory exists, creating it if necessary.
 * Wraps mkdirSync in a try-catch for serverless environments.
 */
const ensureDir = (dirPath) => {
    try {
        if (!fs_1.default.existsSync(dirPath)) {
            fs_1.default.mkdirSync(dirPath, { recursive: true });
        }
    }
    catch (err) {
        console.warn(`Warning: Could not create directory ${dirPath}:`, err);
    }
};
exports.ensureDir = ensureDir;
//# sourceMappingURL=uploadDir.js.map