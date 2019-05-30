
const util = require('util');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { Exception, codes } = require('./exception');

const open = util.promisify(fs.open);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const close = util.promisify(fs.close);
const unlink = util.promisify(fs.unlink);
const readdir = util.promisify(fs.readdir);
const appendFile = util.promisify(fs.appendFile);
const rename = util.promisify(fs.rename);
const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);

const LOG_EXT = '.log';
const ARCHIVE_EXT = '.gz.b64';

class Log {
    constructor() {
        this.baseDir = path.join(__dirname,'/../.log/');
    }

    /**
     * generates a full path for the given log directory. 
     * @param {string} logId the log file.
     */
    logFile(logId) {
        return `${this.baseDir}${logId}`;
    }

    async append(logId, line) {
        const file = this.logFile(logId) + LOG_EXT;
        try {
            const fd = await open(file, 'a');
            try {
                await appendFile(fd, line + '\n');
            } finally {
                await close(fd);
            }
        } catch(err) {
            throw new Exception(codes.IO_EXCEPTION, 'failed to write to log file.', err);
        }
    }

    async list(includeCompressed) {
        try {
            const fileList = await readdir(this.baseDir);
            const logList = [];
            fileList.forEach((filename) => {
                if (filename.endsWith(LOG_EXT)) {
                    logList.push(filename.replace(LOG_EXT, ''));
                } else if (includeCompressed && filename.endsWith(ARCHIVE_EXT)) {
                    logList.push(filename.replace(ARCHIVE_EXT, ''));
                }
            });
            return logList;
        } catch(err) {
            throw new Exception(codes.IO_EXCEPTION, 'failed to get log list.', err);
        }
    }

    async rotate(logId) {
        try {
            const baseFilename = this.logFile(logId);
            // rename the file.
            const file = baseFilename + LOG_EXT;
            // This file will not be picked up by 'list' above.
            const tempFile = `${baseFilename}-${Date.now()}`;
            // the zipped file.
            const zippedFile = tempFile + ARCHIVE_EXT;

            await rename(file, tempFile);
            // compress the new file.
            const buffer = await readFile(tempFile);
            const zippedBuffer = await gzip(buffer);
            const outFd = await open(zippedFile, 'wx');
            try {
                await writeFile(outFd, zippedBuffer.toString('base64'));
            } finally {
                await close(outFd);
            }
            // delete the temp file.
            await unlink(tempFile);
        } catch(err) {
            throw new Exception(codes.IO_EXCEPTION, 'failed to rotate the log.', err);
        }
    }

    async decompress(logId) {
        try {
            const file = this.logFile(logId) + ARCHIVE_EXT;
            const b64 = await readFile(file, 'utf8');
            const zippedBuffer = Buffer.from(b64, 'base64');
            const unzippedBuffer = await gunzip(zippedBuffer);
            return unzippedBuffer.toString();
        } catch(err) {
            throw new Exception(codes.IO_EXCEPTION, 'failed to decompress the log.', err);
        }
    }
}

module.exports = { Log };
