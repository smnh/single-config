const path = require('path');
const fs = require('fs');

module.exports = {
    logErrorAndThrow: logErrorAndThrow,
    ensureDirectoryExistence: ensureDirectoryExistence
};

function logErrorAndThrow(message) {
    console.error('\x1b[31m' + message + '\x1b[0m');
    throw new Error(message);
}

function ensureDirectoryExistence(filePath) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}
