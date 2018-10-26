
const util = require('util');
const fs = require('fs');
const path = require('path');

const open = util.promisify(fs.open);
const writeFile = util.promisify(fs.writeFile);
const truncate = util.promisify(fs.truncate);
const readFile = util.promisify(fs.readFile);
const close = util.promisify(fs.close);
const unlink = util.promisify(fs.unlink);

/**
 * Class for manipulating data in a rudimentary file-based database.
 */
class Data {
    constructor() {
        this.baseDir = path.join(__dirname,'/../.data/');
    }

    dataFilePathName(dir, file) {
       return `${this.baseDir}${dir}/${file}.json`
    }

    /**
     * Writes 
     * @param {integer} fd file descriptor 
     * @param {object} data object to write
     */
    async write(fd, data) {
        const stringData = JSON.stringify(data);
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
        // open the file. This will fail if it already exists:
        const fd = await open(this.dataFilePathName(dir, file), 'wx');
        return this.write(fd, data);
    }

    /**
     * Reads in a data file and parses it into an object.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @returns {Promise(data)} a promise of the data contained in the datafile.
     */
    async read(dir, file) {
        const dataString = await readFile(this.dataFilePathName(dir, file), 'utf8');
        return JSON.parse(dataString);
    }

    /**
     * Updates the data in the given datafile with the data in the given object.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @param {Object} data the object to save in the datafile.
     * @returns {Promise(true)} resolved on success, reject on error. 
     */
    async update(dir, file, data) {
        // opens the file for writing
        const fd = await open(this.dataFilePathName(dir, file), 'r+');
        // erase the contents of the file:
        await truncate(fd);
        return this.write(fd, data);
    }

    /**
     * Deletes the given datafile.
     * @param {string} dir the directory for the datafile.
     * @param {string} file the name of the datafile
     * @returns {Promise} resolved on success, reject on error.
     */
    async delete(dir, file) {
        await unlink(this.dataFilePathName(dir, file));
        return true;
    }
}

module.exports = Data;