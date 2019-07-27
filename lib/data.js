
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
const readdir = util.promisify(fs.readdir);

/**
 * Class for manipulating data in a rudimentary file-based database.
 */
class Data {
    constructor(dir) {
        this.baseDir = path.join(__dirname,'/../.data/', dir);
        this.initialized = false;
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
     */
    dataFileDir() {
        return this.baseDir;
    }

    /**
     * generates a full path for the given datafile in the given directory.
     * @param {string} file the data file.
     */
    dataFilePathName(file) {
       return `${this.dataFileDir()}/${file}.json`
    }

    /**
     * Initializes the directory.
     */
    async init() {
        if (!this.initialized) {
            const fullPath = this.dataFileDir();
            try {
                let stats = await stat(fullPath);
                if (stats.isDirectory()) {
                    this.initialized = true;
                    return true;
                } else {
                    console.log('data directory exists but it is not a directory!');
                    throw new Exception(exception.codes.UNEXPECTED, 'error initializing datastore.');
                }
            } catch (err) {
                if (err.code == 'ENOENT') {
                    await mkdir(fullPath, { recursive: true });
                    this.initialized = true;
                    return true;
                } else {
                    this.handleIoError(err);
                }
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
     * Creates a new data object.
     * @param {string} file the name of the datafile
     * @param {Object} data the data for data object.
     * @returns {Promise(true)} resolved on success, reject on error. 
     */
    async create(file, data) {
        try {
            // on create we'll initialize the datafile directories.
            await this.init();
            // open the file. This will fail if it already exists:
            const fd = await open(this.dataFilePathName(file), 'wx');
            return this.write(fd, data);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * returns true or false to tell wether or not the object exists.
     * @param {string} file the filename
     */
    async exists(file) {
        await this.init();
        try {
            const stats = await stat(this.dataFilePathName(file));
            if(!stats.isFile()) {
                throw new Exception(exception.codes.UNEXPECTED, `${this.dataFilePathName(file)} is not a file!?!`);
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
     * @param {string} file the name of the datafile
     * @returns {Promise(data)} a promise of the data contained in the datafile.
     */
    async read(file) {
        await this.init();
        try {
            const dataString = await readFile(this.dataFilePathName(file), 'utf8');
            return JSON.parse(dataString);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * Updates the data in the given datafile with the data in the given object.
     * @param {string} file the name of the datafile
     * @param {Object} data the object to save in the datafile.
     * @returns {Promise(true)} resolved on success, reject on error. 
     */
    async update(file, data) {
        await this.init();
        try {
            // opens the file for writing
            const fd = await open(this.dataFilePathName(file), 'r+');
            // erase the contents of the file:
            await truncate(fd);
            return this.write(fd, data);
        } catch (err) {
            this.handleIoError(err);
        }
    }

    /**
     * Deletes the given datafile.
     * @param {string} file the name of the datafile
     * @returns {Promise} resolved on success, reject on error.
     */
    async delete(file) {
        await this.init()
        try {
            await unlink(this.dataFilePathName(file));
            return true;
        } catch (err) {
            this.handleIoError(err);
        }
    }

    async list() {
        await this.init();
        try {
            const files = await readdir(this.dataFileDir());
            return files.map((file) => file.replace('.json', ''));
        } catch (err) {
            if (err.code == 'ENOENT') {
                return [];
            }
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