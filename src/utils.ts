import path from 'path';
import fs from 'fs';

export function logErrorAndThrow(message: string): void {
    console.error('\x1b[31m' + message + '\x1b[0m');
    throw new Error(message);
}

export function ensureDirectoryExistence(filePath: string): boolean {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
    return false;
}
