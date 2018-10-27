
class Exception extends Error {
    constructor(code, message, causedBy) {
        super(message);
        this.code = code;
        this.causedBy = causedBy;
    }
}

const codes = {
    UNEXPECTED: 'UNEXPECTED',
    NOT_FOUND: 'NOT_FOUND',
    IO_ERROR: 'IO_ERROR',
}

module.exports = { Exception, codes };