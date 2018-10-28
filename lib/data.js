
const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const exception = require('./exception');

const Exception = exception.Exception;

const open = util.promisify(fs.open);
const writeFile = util.promisify(fs.writeFile);
const truncate = util.promisify(fs.truncate);
const readFile = util.promisify(fs.readFile);
const close = util.promisify(fs.close);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);

/**
 * Class for manipulating data in a rudimentary file-based database.
 */
class Data {
    constructor() {
        this.baseDir = path.join(__dirname,'/../.data/');
    }

    /**
     * A hash function for data stored in the database.
     * @todo make HASHING_SECRET a randomly generated secret unique to the database instance.
     * @param {string} str the string to hash.
     */
    static hash(str) {
        const HASHING_SECRET = 'ThisIsASecret';
        if(typeof(str) == 'string' && str.length > 0) {
            return crypto.createHmac('sha256', HASHING_SECRET).update(str).digest('hex');
        } else {
            return false;
        }
    }

    /**
     * generates a full path for the given data directory. 
     * @param {string} dir the data directory.
     */
    dataFileDir(dir) {
        return `${this.baseDir}${dir}`;
    }

    /**
     * generates a full path for the given datafile in the given directory.
     * @param {string} dir the data directory.
     * @param {string} file the data file.
     */
    dataFilePathName(dir, file) {
       return `${this.dataFileDir(dir)}/${file}.json`
    }

    /**
     * Initializes the directory.
     * @param {string} dir the datafile directory.
     */
    async init(dir) {
        const fullPath = this.dataFileDir(dir);
        try {
            let stats = await stat(fullPath);
            if (stats.isDirectory()) {
                return true;
            } else {
                console.log('data directory exists but it is not a directory!');
                throw new Exception(exception.codes.UNEXPECTED, 'error initializing datastore.');
            }
        } catch (err) {
            if (err.code == 'ENOENT') {
                await mkdir(fullPath);
                return true;
            } else {
                this.handleIoError(err);
            }
        }
    }

    /**
     * Writes 
     * @param {integer} fd file descriptor 
     * @param {object} data object to write
     */
    async write(fd, data) {
        const stringData = JSON.stringify(data, null, 2);
        await writeFile(fd, stringData);
        await close(fd);
        return true;      
    }

    /**
     * Creates a new data file given the dir, file and data object.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @param {Object} data the data for data object.
     * @returns {Promise(true)} resolved on success, reject on error. 
     */
    async create(dir, file, data) {
        try {
            // on create we'll initialize the datafile directories.
            await this.init(dir);
            // open the file. This will fail if it already exists:
            const fd = await open(this.dataFilePathName(dir, file), 'wx');
            return this.write(fd, data);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * returns true or false to tell wether or not the datafile exists.
     * @param {string} dir the directory
     * @param {string} file the filename
     */
    async exists(dir, file) {
        try {
            const stats = await stat(this.dataFilePathName(dir, file));
            if(!stats.isFile()) {
                throw new Exception(exception.codes.UNEXPECTED, `${this.dataFilePathName(dir,file)} is not a file!?!`);
            }
            return true;
        } catch (err) {
            if (err.code == 'ENOENT') {
                return false;
            } else {
                this.handleIoError(err);
            }
        }
    }

    /**
     * Reads in a data file and parses it into an object.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @returns {Promise(data)} a promise of the data contained in the datafile.
     */
    async read(dir, file) {
        try {
            const dataString = await readFile(this.dataFilePathName(dir, file), 'utf8');
            return JSON.parse(dataString);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * Updates the data in the given datafile with the data in the given object.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @param {Object} data the object to save in the datafile.
     * @returns {Promise(true)} resolved on success, reject on error. 
     */
    async update(dir, file, data) {
        try {
            // opens the file for writing
            const fd = await open(this.dataFilePathName(dir, file), 'r+');
            // erase the contents of the file:
            await truncate(fd);
            return this.write(fd, data);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * Deletes the given datafile.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @returns {Promise} resolved on success, reject on error.
     */
    async delete(dir, file) {
        try {
            await unlink(this.dataFilePathName(dir, file));
            return true;
        } catch (err) {
            this.handleIoError(err);
        }
    }

    handleIoError(err) {
        let exCode = exception.codes.IO_ERROR;
        if (err.code == 'ENOENT') {
            exCode = exception.codes.NOT_FOUND;
        }
        throw new Exception(exCode, 'error reading datafile.', err);
    }
}

module.exports = { Data };