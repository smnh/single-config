import path from 'path';
import { promises as fs } from 'fs';

export function logErrorAndThrow(message: string): void {
    console.error('\x1b[31m' + message + '\x1b[0m');
    throw new Error(message);
}

export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch (e) {
        return false;
    }
}

export async function ensureDirectoryExistence(filePath: string): Promise<boolean> {
    let dirname = path.dirname(filePath);
    if (await fileExists(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    await fs.mkdir(dirname);
    return false;
}
